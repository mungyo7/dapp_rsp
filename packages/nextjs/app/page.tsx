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
  const [lastGameResult, setLastGameResult] = useState<{
    result: number;
    payout: bigint;
    playerChoice: number;
    contractChoice: number;
  } | null>(null);

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

    const notificationId = notification.loading("게임 진행 중...");

    try {
      console.log("Choice:", choice); // 디버깅을 위한 로그 추가
      console.log("Bet Amount:", betAmount); // 디버깅을 위한 로그 추가
      
      const hash = await rpsContract.write.play(
        [choice + 1],
        { value: parseEther(betAmount) }
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
        setLastGameResult({
          result: Number(decodedData.args.result),
          payout: decodedData.args.payout,
          playerChoice: Number(decodedData.args.playerChoice),
          contractChoice: Number(decodedData.args.contractChoice),
        });
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
    const interval = setInterval(updateBlockNumber, 5000);
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

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <h1 className="text-4xl font-bold mb-8">가위바위보 게임</h1>
      
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
              onClick={() => handlePlay(2)}
            >
              ✋ 보
            </button>
            <button
              className="btn btn-primary flex-1"
              onClick={() => handlePlay(1)}
            >
              ✊ 바위
            </button>
            <button
              className="btn btn-primary flex-1"
              onClick={() => handlePlay(3)}
            >
              ✌️ 가위
            </button>
          </div>
        </div>

        {lastGameResult && (
          <div className="my-6 p-4 bg-base-200 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">최근 게임 결과</h2>
            <div className="space-y-2">
              <p>
                플레이어의 선택: {getChoiceEmoji(lastGameResult.playerChoice)}{" "}
                {getChoiceText(lastGameResult.playerChoice)}
              </p>
              <p>
                컨트랙트의 선택: {getChoiceEmoji(lastGameResult.contractChoice)}{" "}
                {getChoiceText(lastGameResult.contractChoice)}
              </p>
              <p className="font-bold">
                결과: {getResultText(lastGameResult.result)}
              </p>
              <p>
                받은 금액: {Number(lastGameResult.payout) / 1e18} ETH
              </p>
            </div>
          </div>
        )}

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
          </div>
        </div>
      </div>
    </div>
  );
}
