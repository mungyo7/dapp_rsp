const getChoiceEmoji = (choice: number) => {
  switch (choice) {
    case 1: return "✊"; // 바위
    case 2: return "✋"; // 보
    case 3: return "✌️"; // 가위
    default: return "";
  }
}; 