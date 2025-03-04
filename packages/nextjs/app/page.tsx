"use client";

import { useEffect, useState } from "react";
import { usePublicClient, useWalletClient } from "wagmi";
import { parseEther, decodeEventLog } from "viem";
import { Address } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useScaffoldContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

export default function Home() {
  const [currentBlock, setCurrentBlock] = useState<number>(0);
  const [betAmount, setBetAmount] = useState<string>("0.01");
  const [gameHistory, setGameHistory] = useState<{
    result: number;
    payout: bigint;
    playerChoice: number;
    contractChoice: number;
    timestamp: number;
    txHash: string;
    userAddress: `0x${string}`;
    betAmount: string;
  }[]>([]);
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { data: deployedContractData } = useDeployedContractInfo("RockPaperScissors");
  
  // 컨트랙트 인스턴스
  const { data: rpsContract } = useScaffoldContract({
    contractName: "RockPaperScissors",
    walletClient: walletClient ?? undefined,
  });

  // 컨트랙트 잔액 상태
  const [contractBalance, setContractBalance] = useState<bigint>(BigInt(0));

  // 컨트랙트 잔액 읽기
  useEffect(() => {
    const getBalance = async () => {
      if (rpsContract) {
        try {
          const balance = await rpsContract.read.getBalance();
          setContractBalance(balance);
        } catch (error) {
          console.error("Failed to get balance:", error);
        }
      }
    };

    getBalance();
    const interval = setInterval(getBalance, 5000);
    return () => clearInterval(interval);
  }, [rpsContract]);

  // 게임 결과 텍스트 반환
  const getResultText = (result: number) => {
    switch (result) {
      case 0: return "패배 (베팅 금액을 잃었습니다)";
      case 1: return "무승부 (베팅 금액이 환불됩니다)";
      case 2: return "승리 (베팅 금액의 2배를 받았습니다)";
      default: return "";
    }
  };

  // 게임 플레이 함수
  const handlePlay = async (choice: number) => {
    if (!rpsContract || !publicClient) {
      notification.error("컨트랙트가 연결되지 않았습니다");
      return;
    }

    // 베팅 금액 유효성 검사
    if (isNaN(Number(betAmount)) || Number(betAmount) <= 0) {
      notification.error("올바른 베팅 금액을 입력해주세요");
      return;
    }

    // 컨트랙트 잔액과 베팅 금액 비교
    const betAmountWei = parseEther(betAmount);
    if (betAmountWei > contractBalance) {
      notification.error("베팅 금액이 너무 큽니다. 컨트랙트의 잔액이 부족합니다.");
      return;
    }

    const notificationId = notification.loading("게임 진행 중...");

    try {
      console.log("Choice:", choice); // 디버깅을 위한 로그 추가
      console.log("Bet Amount:", betAmount); // 디버깅을 위한 로그 추가
      
      const hash = await rpsContract.write.play(
        [choice],
        { value: betAmountWei }
      );
      
      // 트랜잭션 완료 대기
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      // 이벤트에서 게임 결과 가져오기
      const logs = await publicClient.getLogs({
        address: deployedContractData?.address,
        event: rpsContract.abi.find(x => x.type === "event" && x.name === "GamePlayed"),
        fromBlock: receipt.blockNumber,
        toBlock: receipt.blockNumber,
      });

      if (logs[0]) {
        const log = logs[0];
        const decodedData = decodeEventLog({
          abi: rpsContract.abi,
          eventName: 'GamePlayed',
          data: log.data,
          topics: log.topics,
        });
        const gameResult = {
          result: Number(decodedData.args.result),
          payout: decodedData.args.payout,
          playerChoice: Number(decodedData.args.playerChoice),
          contractChoice: Number(decodedData.args.contractChoice),
          timestamp: Date.now(),
          txHash: hash,
          userAddress: walletClient?.account.address as `0x${string}`,
          betAmount: betAmount
        };
        
        // 히스토리에 새로운 게임 결과 추가
        setGameHistory(prev => [gameResult, ...prev]);
      }
      
      // 잔액 업데이트
      const newBalance = await rpsContract.read.getBalance();
      setContractBalance(newBalance);

      notification.remove(notificationId);
      notification.success("게임이 완료되었습니다!");
    } catch (error: any) {
      notification.remove(notificationId);
      console.error("게임 플레이 중 오류:", error);
      notification.error(
        `게임 플레이 실패: ${error.message}` // 에러 메시지 상세 표시
      );
    }
  };

  // 현재 블록 넘버 업데이트
  useEffect(() => {
    const updateBlockNumber = async () => {
      if (!publicClient) return;
      const blockNumber = await publicClient.getBlockNumber();
      setCurrentBlock(Number(blockNumber));
    };

    updateBlockNumber();
    const interval = setInterval(updateBlockNumber, 2000);
    return () => clearInterval(interval);
  }, [publicClient]);

  // 선택에 따른 이모지 반환
  const getChoiceEmoji = (choice: number) => {
    switch (choice) {
      case 1: return "✊"; // 바위
      case 2: return "✋"; // 보
      case 3: return "✌️"; // 가위
      default: return "";
    }
  };

  // 선택에 따른 텍스트 반환
  const getChoiceText = (choice: number) => {
    switch (choice) {
      case 1: return "바위";
      case 2: return "보";
      case 3: return "가위";
      default: return "";
    }
  };

  // withdraw 함수 추가
  const handleWithdraw = async () => {
    if (!rpsContract || !publicClient) {
      notification.error("컨트랙트가 연결되지 않았습니다");
      return;
    }

    const notificationId = notification.loading("출금 진행 중...");

    try {
      const hash = await rpsContract.write.withdraw();
      await publicClient.waitForTransactionReceipt({ hash });

      // 잔액 업데이트
      const newBalance = await rpsContract.read.getBalance();
      setContractBalance(newBalance);

      notification.remove(notificationId);
      notification.success("출금이 완료되었습니다!");
    } catch (error: any) {
      notification.remove(notificationId);
      console.error("출금 중 오류:", error);
      notification.error(
        `출금 실패: ${error.message}`
      );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <h1 className="text-4xl font-bold mb-8">가위바위보 게임</h1>
      
      <div className="flex flex-row justify-center gap-8">
        {/* 왼쪽 메인 게임 섹션 */}
        <div className="bg-base-100 shadow-lg rounded-lg p-6 w-96">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">Current Block Number</h2>
            <p className="text-3xl font-mono">{currentBlock}</p>
          </div>

          <div className="my-6">
            <h2 className="text-xl font-semibold mb-4">게임 플레이</h2>
            <div className="mb-4">
              <label className="text-sm text-gray-500">베팅 금액 (ETH):</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                className="input input-bordered w-full mt-1"
                placeholder="베팅 금액을 입력하세요"
              />
            </div>
            <div className="flex justify-between gap-2">
              <button
                className="btn btn-primary flex-1"
                onClick={() => handlePlay(1)}
              >
                ✊ 바위
              </button>
              <button
                className="btn btn-primary flex-1"
                onClick={() => handlePlay(2)}
              >
                ✋ 보
              </button>
              <button
                className="btn btn-primary flex-1"
                onClick={() => handlePlay(3)}
              >
                ✌️ 가위
              </button>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-2">컨트랙트 정보</h2>
            {deployedContractData && (
              <div className="mb-2">
                <h3 className="text-sm font-semibold">주소:</h3>
                <Address address={deployedContractData.address} />
              </div>
            )}
            <div>
              <h3 className="text-sm font-semibold">잔액:</h3>
              <p className="text-xl font-mono">
                {contractBalance ? Number(contractBalance) / 1e18 : "0"} ETH
              </p>
              <button
                className="btn btn-secondary mt-2"
                onClick={handleWithdraw}
              >
                컨트랙트 잔액 출금
              </button>
            </div>
          </div>
        </div>

        {/* 오른쪽 게임 히스토리 섹션 */}
        <div className="bg-base-100 shadow-lg rounded-lg p-6 w-96">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">게임 히스토리</h2>
            <span className="bg-primary text-white px-3 py-1 rounded-full text-sm">
              총 {gameHistory.length}게임
            </span>
          </div>
          
          <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
            {gameHistory.map((game, index) => (
              <div 
                key={index} 
                className="bg-base-200 rounded-xl p-4 transform transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="text-xl font-bold">
                    {getResultText(game.result).includes("승리") ? (
                      <span className="text-success">승리 🎉</span>
                    ) : getResultText(game.result).includes("무승부") ? (
                      <span className="text-warning">무승부 🤝</span>
                    ) : (
                      <span className="text-error">패배 😢</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(game.timestamp).toLocaleString()}
                  </span>
                </div>

                <div className="mb-3 p-2 bg-base-300 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">플레이어 주소</div>
                  <Address address={game.userAddress} />
                </div>

                <div className="flex justify-center items-center gap-4 my-4 p-3 bg-base-300 rounded-lg">
                  <div className="text-center">
                    <div className="text-3xl mb-1">{getChoiceEmoji(game.playerChoice)}</div>
                    <div className="text-sm">플레이어</div>
                  </div>
                  <div className="text-xl font-bold">VS</div>
                  <div className="text-center">
                    <div className="text-3xl mb-1">{getChoiceEmoji(game.contractChoice)}</div>
                    <div className="text-sm">컨트랙트</div>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-3">
                  <div className={`font-semibold ${
                    game.result === 2 ? 'text-success' : // 승리
                    game.result === 1 ? 'text-warning' : // 무승부
                    'text-error' // 패배
                  }`}>
                    {game.result === 2 ? (
                      `+${game.betAmount} ETH`
                    ) : game.result === 1 ? (
                      `±0 ETH`
                    ) : (
                      `-${game.betAmount} ETH`
                    )}
                  </div>
                  <a 
                    href={`https://arbiscan.io/tx/${game.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary-focus transition-colors"
                  >
                    <span>트랜잭션 보기</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            ))}
            {gameHistory.length === 0 && (
              <div className="text-center py-10">
                <div className="text-4xl mb-3">🎮</div>
                <p className="text-gray-500">아직 게임 기록이 없습니다</p>
                <p className="text-sm text-gray-400">첫 게임을 시작해보세요!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
