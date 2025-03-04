"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isAddress, isHex } from "viem";
import { hardhat } from "viem/chains";
import { usePublicClient, useAccount } from "wagmi";
import { createPublicClient, http } from "viem";

// Arbitrum 네트워크 정의
const ARBITRUM_CHAIN_ID = 42161;
const ARBITRUM_RPC_URL = "https://arb1.arbitrum.io/rpc";

// Arbitrum 클라이언트 설정
const arbitrumClient = createPublicClient({
  chain: {
    ...hardhat,
    id: ARBITRUM_CHAIN_ID,
  },
  transport: http(ARBITRUM_RPC_URL),
});

export const SearchBar = () => {
  const [searchInput, setSearchInput] = useState("");
  const router = useRouter();
  const { chain } = useAccount();

  // Arbitrum 체인 확인
  const isArbitrum = chain?.id === ARBITRUM_CHAIN_ID;

  const localClient = usePublicClient({ chainId: hardhat.id });
  const client = isArbitrum ? arbitrumClient : localClient;

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isHex(searchInput)) {
      try {
        const tx = await client?.getTransaction({ hash: searchInput });
        if (tx) {
          router.push(`/blockexplorer/transaction/${searchInput}`);
          return;
        }
      } catch (error) {
        console.error("Failed to fetch transaction:", error);
      }
    }

    if (isAddress(searchInput)) {
      router.push(`/blockexplorer/address/${searchInput}`);
      return;
    }
  };

  return (
    <form onSubmit={handleSearch} className="flex items-center justify-end mb-5 space-x-3 mx-5">
      <input
        className="border-primary bg-base-100 text-base-content p-2 mr-2 w-full md:w-1/2 lg:w-1/3 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-accent"
        type="text"
        value={searchInput}
        placeholder="Search by hash or address"
        onChange={e => setSearchInput(e.target.value)}
      />
      <button className="btn btn-sm btn-primary" type="submit">
        Search
      </button>
    </form>
  );
};
