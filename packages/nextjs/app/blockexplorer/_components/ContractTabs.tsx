"use client";

import { useEffect, useState } from "react";
import { AddressCodeTab } from "./AddressCodeTab";
import { AddressLogsTab } from "./AddressLogsTab";
import { AddressStorageTab } from "./AddressStorageTab";
import { PaginationButton } from "./PaginationButton";
import { TransactionsTable } from "./TransactionsTable";
import { createPublicClient, http } from "viem";
import { hardhat } from "viem/chains";
import { useAccount } from "wagmi";
import { useFetchBlocks } from "~~/hooks/scaffold-eth";

// Arbitrum 네트워크 정의
const ARBITRUM_CHAIN_ID = 42161;
const ARBITRUM_RPC_URL = "https://arb1.arbitrum.io/rpc";

type AddressCodeTabProps = {
  bytecode: string;
  assembly: string;
};

type PageProps = {
  address: string;
  contractData: AddressCodeTabProps | null;
};

// 기본 클라이언트 설정
const publicClient = createPublicClient({
  chain: hardhat,
  transport: http(),
});

// Arbitrum 클라이언트 설정
const arbitrumClient = createPublicClient({
  chain: {
    ...hardhat,
    id: ARBITRUM_CHAIN_ID,
  },
  transport: http(ARBITRUM_RPC_URL),
});

export const ContractTabs = ({ address, contractData }: PageProps) => {
  const { blocks, transactionReceipts, currentPage, totalBlocks, setCurrentPage } = useFetchBlocks();
  const [activeTab, setActiveTab] = useState("transactions");
  const [isContract, setIsContract] = useState(false);
  const { chain } = useAccount();
  
  // Arbitrum 체인 확인
  const isArbitrum = chain?.id === ARBITRUM_CHAIN_ID;
  
  // 현재 체인에 맞는 클라이언트 선택
  const client = isArbitrum ? arbitrumClient : publicClient;

  useEffect(() => {
    const checkIsContract = async () => {
      const contractCode = await client.getBytecode({ 
        address: address as `0x${string}` 
      });
      setIsContract(contractCode !== undefined && contractCode !== "0x");
    };

    checkIsContract();
  }, [address, client]);

  const filteredBlocks = blocks.filter(block =>
    block.transactions.some(tx => {
      if (typeof tx === "string") {
        return false;
      }
      return tx.from.toLowerCase() === address.toLowerCase() || tx.to?.toLowerCase() === address.toLowerCase();
    }),
  );

  return (
    <>
      {isContract && (
        <div className="tabs tabs-lifted w-min">
          <button
            className={`tab ${activeTab === "transactions" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("transactions")}
          >
            Transactions
          </button>
          <button className={`tab ${activeTab === "code" ? "tab-active" : ""}`} onClick={() => setActiveTab("code")}>
            Code
          </button>
          <button
            className={`tab  ${activeTab === "storage" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("storage")}
          >
            Storage
          </button>
          <button className={`tab  ${activeTab === "logs" ? "tab-active" : ""}`} onClick={() => setActiveTab("logs")}>
            Logs
          </button>
        </div>
      )}
      {activeTab === "transactions" && (
        <div className="pt-4">
          <TransactionsTable blocks={filteredBlocks} transactionReceipts={transactionReceipts} />
          <PaginationButton
            currentPage={currentPage}
            totalItems={Number(totalBlocks)}
            setCurrentPage={setCurrentPage}
          />
        </div>
      )}
      {activeTab === "code" && contractData && (
        <AddressCodeTab bytecode={contractData.bytecode} assembly={contractData.assembly} />
      )}
      {activeTab === "storage" && <AddressStorageTab address={address as `0x${string}`} />}
      {activeTab === "logs" && <AddressLogsTab address={address as `0x${string}`} />}
    </>
  );
};
