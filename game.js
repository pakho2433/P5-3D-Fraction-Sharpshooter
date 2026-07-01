(() => {
  'use strict';

  const files = [
    'game.parts/part1.txt',
    'game.parts/part2.txt',
    'game.parts/part3.txt',
    'game.parts/part4.txt',
    'game.parts/part5.txt',
    'game.parts/part6.txt',
    'game.parts/part7.txt'
  ];

  async function start() {
    try {
      const parts = [];
      for (const file of files) {
        const response = await fetch(file, { cache: 'no-store' });
        if (!response.ok) throw new Error(`無法載入 ${file}：${response.status}`);
        parts.push(await response.text());
      }
      (0, eval)(parts.join(''));
    } catch (error) {
      console.error(error);
      const feedback = document.getElementById('feedbackCard');
      if (feedback) {
        feedback.textContent = '遊戲載入失敗，請重新整理頁面。';
        feedback.classList.add('bad', 'show');
      }
    }
  }

  start();
})();
