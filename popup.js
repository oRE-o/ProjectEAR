document.addEventListener('DOMContentLoaded', () => {
  // --- Element 가져오기 ---
  const masterToggle = document.getElementById('masterToggle');
  
  const imageUrlRabbit = document.getElementById('imageUrlRabbit');
  const imageFileRabbit = document.getElementById('imageFileRabbit');
  const imageUrlTurtle = document.getElementById('imageUrlTurtle');
  const imageFileTurtle = document.getElementById('imageFileTurtle');
  
  const rabbitSettings = document.getElementById('rabbitSettings');
  const turtleSettings = document.getElementById('turtleSettings');
  
  const saveButton = document.getElementById('saveButton');
  const resetButton = document.getElementById('resetButton');
  const statusEl = document.getElementById('status');
  
  const DEFAULT_RABBIT_URL = 'https://media1.tenor.com/m/kiTCQ9dkCfMAAAAC/chainsaw-man-chainsaw-man-dance.gif';
  const DEFAULT_TURTLE_URL = 'https://media1.tenor.com/m/Vyts2XFg1vsAAAAC/reze-chainsaw-man.gif';

  // --- 함수 정의 ---

  /**
   * 마스터 토글 상태에 따라 UI 컴포넌트를 활성화/비활성화합니다.
   * @param {boolean} isEnabled - 확장 기능 활성화 여부
   */
  function updateUiState(isEnabled) {
    imageUrlRabbit.disabled = !isEnabled;
    imageFileRabbit.disabled = !isEnabled;
    imageUrlTurtle.disabled = !isEnabled;
    imageFileTurtle.disabled = !isEnabled;
    saveButton.disabled = !isEnabled;
    resetButton.disabled = !isEnabled;
    
    rabbitSettings.style.opacity = isEnabled ? 1 : 0.5;
    turtleSettings.style.opacity = isEnabled ? 1 : 0.5;
  }

  /**
   * File 객체 또는 URL 문자열을 받아 chrome.storage.local에 저장합니다.
   * File 객체가 우선순위를 가집니다.
   * @param {string} key - 저장할 스토리지 키
   * @param {string} url - 이미지 URL (text input)
   * @param {File | undefined} file - 이미지 파일 (file input)
   * @returns {Promise<boolean>} 파일이 저장되었는지 여부
   */
  function saveImage(key, url, file) {
    return new Promise((resolve, reject) => {
      if (file) {
        // (우선순위 1) 파일이 있으면 Data URL로 변환하여 저장
        const reader = new FileReader();
        reader.onload = (e) => {
          chrome.storage.local.set({ [key]: e.target.result }, () => resolve(true));
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      } else if (url) {
        // (우선순위 2) 파일이 없고 URL이 있으면 URL 문자열 그대로 저장
        chrome.storage.local.set({ [key]: url }, () => resolve(false));
      } else {
        // 입력값이 없으면 아무 작업도 하지 않음
        resolve(false);
      }
    });
  }

  /**
   * 사용자에게 상태 메시지를 표시합니다.
   * @param {string} message - 표시할 텍스트
   * @param {'success' | 'warning' | 'info' | 'error'} type - 메시지 타입
   */
  function showStatus(message, type = 'success') {
    statusEl.textContent = message;
    statusEl.style.color = type === 'success' ? 'green' : 
                          type === 'warning' ? 'orange' :
                          type === 'info'    ? 'blue' : 'red';
  }

  // --- 이벤트 리스너 및 초기화 ---

  // 1. 팝업 로드 시 저장된 설정 값 불러오기
  chrome.storage.local.get(
    ['userImageRabbit', 'userImageTurtle', 'isExtensionEnabled'], 
    (data) => {
      // 1-1. 토끼 URL 로드 (Data URL은 로드하지 않음)
      if (data.userImageRabbit && data.userImageRabbit.startsWith('http')) {
        imageUrlRabbit.value = data.userImageRabbit;
      } else if (!data.userImageRabbit) {
        // (저장된 값이 아예 없으면 기본 URL 표시)
        imageUrlRabbit.value = DEFAULT_RABBIT_URL;
      }
      // (Data URL이 저장되어 있으면 입력창은 비워둠)

      // 1-2. 거북이 URL 로드
      if (data.userImageTurtle && data.userImageTurtle.startsWith('http')) {
        imageUrlTurtle.value = data.userImageTurtle;
      } else if (!data.userImageTurtle) {
        imageUrlTurtle.value = DEFAULT_TURTLE_URL;
      }
      
      // 1-3. 마스터 토글 상태 로드
      const isEnabled = data.isExtensionEnabled !== false; 
      masterToggle.checked = isEnabled;
      
      // 1-4. UI 상태 동기화
      updateUiState(isEnabled);
    }
  );

  // 2. 마스터 토글 스위치
  masterToggle.addEventListener('change', () => {
    const isEnabled = masterToggle.checked;
    chrome.storage.local.set({ isExtensionEnabled: isEnabled });
    updateUiState(isEnabled);
    
    showStatus(isEnabled ? '확장 기능 활성화됨.' : '확장 기능 비활성화됨.', 'info');
    setTimeout(() => statusEl.textContent = '', 2000);
  });

  // 3. 파일 선택 시 사용자에게 경고
  const fileWarning = () => {
    showStatus('파일 선택됨. "설정 저장"을 눌러주세요.', 'warning');
  };
  imageFileRabbit.addEventListener('change', fileWarning);
  imageFileTurtle.addEventListener('change', fileWarning);

  // 4. 저장 버튼
  saveButton.addEventListener('click', async () => {
    
    saveButton.disabled = true;
    const hasFile = imageFileRabbit.files[0] || imageFileTurtle.files[0];
    if (hasFile) {
      showStatus('파일 저장 중... (팝업을 닫지 마세요!)', 'info');
    } else {
      showStatus('저장 중...', 'info');
    }

    try {
      // (로직 수정!) 파일이 없으면, URL 입력창의 값을 저장.
      const rabbitFileUsed = await saveImage('userImageRabbit', imageUrlRabbit.value, imageFileRabbit.files[0]);
      const turtleFileUsed = await saveImage('userImageTurtle', imageUrlTurtle.value, imageFileTurtle.files[0]);
      
      // (중요!) 파일이 사용된 경우, URL 입력창을 비움
      if (rabbitFileUsed) {
        imageUrlRabbit.value = '';
      }
      if (turtleFileUsed) {
        imageUrlTurtle.value = '';
      }
      
      imageFileRabbit.value = '';
      imageFileTurtle.value = '';

      showStatus('설정이 저장되었습니다.', 'success');
      
    } catch (error) {
      console.error('설정 저장 중 오류 발생:', error);
      showStatus('오류: 저장이 실패했습니다.', 'error');
    } finally {
      saveButton.disabled = false;
      setTimeout(() => {
        if (masterToggle.checked) {
          saveButton.disabled = false;
        }
        if (statusEl.textContent === '설정이 저장되었습니다.') {
          statusEl.textContent = '';
        }
      }, 2000);
    }
  });

  resetButton.addEventListener('click', () => {
    // 이미지 설정을 '기본 URL'로 되돌림
    chrome.storage.local.set({
        'userImageRabbit': DEFAULT_RABBIT_URL,
        'userImageTurtle': DEFAULT_TURTLE_URL
    }, () => {
      // 입력창에도 기본 URL을 표시
      imageUrlRabbit.value = DEFAULT_RABBIT_URL;
      imageUrlTurtle.value = DEFAULT_TURTLE_URL;
      
      // 파일 입력창은 비움
      imageFileRabbit.value = '';
      imageFileTurtle.value = '';
      
      showStatus('설정이 기본값으로 초기화되었습니다.', 'success');
      setTimeout(() => statusEl.textContent = '', 2000);
    });
  });
});