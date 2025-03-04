"use client";

import { useEffect, useState } from "react";
import { Address, createPublicClient, http, toHex } from "viem";
import { hardhat } from "viem/chains";
import { useAccount } from "wagmi";

// Arbitrum 네트워크 정의
const ARBITRUM_CHAIN_ID = 42161;
const ARBITRUM_RPC_URL = "https://arb1.arbitrum.io/rpc";

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

export const AddressStorageTab = ({ address }: { address: Address }) => {
  const [storage, setStorage] = useState<string[]>([]);
  const { chain } = useAccount();

  // Arbitrum 체인 확인
  const isArbitrum = chain?.id === ARBITRUM_CHAIN_ID;

  // 현재 체인에 맞는 클라이언트 선택
  const client = isArbitrum ? arbitrumClient : publicClient;

  useEffect(() => {
    const fetchStorage = async () => {
      try {
        const storageData = [];
        let idx = 0;

        while (true) {
          const storageAtPosition = await client.getStorageAt({
            address: address,
            slot: toHex(idx),
          });

          if (storageAtPosition === "0x" + "0".repeat(64)) break;

          if (storageAtPosition) {
            storageData.push(storageAtPosition);
          }

          idx++;
        }
        setStorage(storageData);
      } catch (error) {
        console.error("Failed to fetch storage:", error);
      }
    };

    fetchStorage();
  }, [address, client]);

  return (
    <div className="flex flex-col gap-3 p-4">
      {storage.length > 0 ? (
        <div className="mockup-code overflow-auto max-h-[500px]">
          <pre className="px-5 whitespace-pre-wrap break-words">
            {storage.map((data, i) => (
              <div key={i}>
                <strong>Storage Slot {i}:</strong> {data}
              </div>
            ))}
          </pre>
        </div>
      ) : (
        <div className="text-lg">This contract does not have any variables.</div>
      )}
    </div>
  );
};
