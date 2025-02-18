// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract RockPaperScissors is Ownable {
    constructor() Ownable() {}

    event GamePlayed(
        address indexed player,
        uint8 playerChoice,
        uint8 contractChoice,
        uint8 result,
        uint256 payout
    );

    event FundsWithdrawn(address indexed owner, uint256 amount);

    // 컨트랙트 잔액 확인
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    // 게임 플레이 함수
    function play(uint8 _playerChoice) public payable {
        require(msg.value > 0, "Betting amount must be greater than 0");
        require(_playerChoice >= 1 && _playerChoice <= 3, "Invalid choice");
        
        // 컨트랙트의 잔액이 승리 상금(베팅 금액과 동일)을 지급할 수 있는지 확인
        require(address(this).balance >= msg.value, "Contract doesn't have enough balance for reward");

        uint8 contractChoice = uint8((block.number % 3) + 1); // 1, 2, 3
        uint8 result;
        uint256 payout;

        // 게임 결과 계산 (1: 바위, 2: 보, 3: 가위)
        if (_playerChoice == contractChoice) {
            // 무승부
            result = 1;
            payout = msg.value; // 베팅 금액만 반환
        } else if (
            (_playerChoice == 1 && contractChoice == 3) || // 바위 vs 가위
            (_playerChoice == 2 && contractChoice == 1) || // 보 vs 바위
            (_playerChoice == 3 && contractChoice == 2)    // 가위 vs 보
        ) {
            // 승리
            result = 2;
            payout = msg.value * 2; // 베팅 금액 + 상금(베팅 금액만큼)
        } else {
            // 패배
            result = 0;
            payout = 0; // 베팅 금액 잃음
        }

        // 승리하거나 무승부인 경우에만 보상금 지급
        if (payout > 0) {
            (bool success, ) = payable(msg.sender).call{value: payout}("");
            require(success, "Failed to send payout");
        }

        emit GamePlayed(msg.sender, _playerChoice, contractChoice, result, payout);
    }

    // 컨트랙트 소유자가 자금을 인출하는 함수
    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Failed to withdraw funds");
        
        emit FundsWithdrawn(owner(), balance);
    }

    // 컨트랙트가 이더를 받을 수 있도록 하는 함수
    receive() external payable {}
}