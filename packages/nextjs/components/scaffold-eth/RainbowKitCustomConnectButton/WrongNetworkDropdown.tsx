import { NetworkOptions } from "./NetworkOptions";
import { useDisconnect, useAccount } from "wagmi";
import { ArrowLeftOnRectangleIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";

// Arbitrum 네트워크 ID 정의
const ARBITRUM_CHAIN_ID = 42161;

export const WrongNetworkDropdown = () => {
  const { disconnect } = useDisconnect();
  const { chain } = useAccount();
  const { targetNetwork } = useTargetNetwork();

  // Arbitrum인 경우도 허용된 네트워크로 표시 문구 변경
  const isWrongNetwork = chain && chain.id !== targetNetwork.id && chain.id !== ARBITRUM_CHAIN_ID;
  const networkName = chain?.id === ARBITRUM_CHAIN_ID ? "Arbitrum" : "Wrong network";

  return (
    <div className="dropdown dropdown-end mr-2">
      <label
        tabIndex={0}
        className={`btn ${isWrongNetwork ? "btn-error" : "btn-primary"} btn-sm dropdown-toggle gap-1`}
      >
        <span>{networkName}</span>
        <ChevronDownIcon className="h-6 w-4 ml-2 sm:ml-0" />
      </label>
      <ul
        tabIndex={0}
        className="dropdown-content menu p-2 mt-1 shadow-center shadow-accent bg-base-200 rounded-box gap-1"
      >
        <NetworkOptions />
        <li>
          <button
            className="menu-item text-error btn-sm !rounded-xl flex gap-3 py-3"
            type="button"
            onClick={() => disconnect()}
          >
            <ArrowLeftOnRectangleIcon className="h-6 w-4 ml-2 sm:ml-0" />
            <span>Disconnect</span>
          </button>
        </li>
      </ul>
    </div>
  );
};
