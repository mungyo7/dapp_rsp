export type ContractName = "RockPaperScissors" | "BuyMeACoffee";

export type Contract = {
  address: string;
  abi: any[];
};

export type ScaffoldContract = {
  contractName: "BuyMeACoffee" | "RockPaperScissors";
}; 