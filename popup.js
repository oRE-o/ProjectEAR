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
  
  // 기본 URL 정의
  const DEFAULT_RABBIT_URL = 'https://i.imgur.com/bi29MUr.gif';
  const DEFAULT_TURTLE_URL = 'https://i.imgur.com/JbKF2DP.jpeg';

  // --- 함수 정의 ---

  /**
   * UI 컴포넌트를 활성화/비활성화합니다.
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
   * File 객체 또는 URL 문자열을 chrome.storage.local에 저장합니다.
   * File 객체가 우선순위를 가집니다.
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
        // 입력값이 없으면 아무 작업도 하지 않음 (덮어쓰기 방지)
        resolve(false);
      }
    });
  }

  /**
   * 사용자에게 상태 메시지를 표시합니다.
   */
  function showStatus(message, type = 'success') {
    statusEl.textContent = message;
    statusEl.style.color = type === 'success' ? 'green' : 
                          type === 'warning' ? 'orange' :
                          type === 'info'    ? 'blue' : 'red';
  }
  
  // ✨✨✨ (새 함수!) 파일이 선택되면 '즉시' 저장하는 함수 ✨✨✨
  /**
   * <input type="file">의 'change' 이벤트를 받아,
   * 파일을 즉시 Data URL로 변환하고 저장합니다.
   * @param {Event} e - 'change' 이벤트 객체
   */
  async function handleFileSelectAndSave(e) {
    const fileInput = e.target;
    const file = fileInput.files[0];

    if (!file) return; // 사용자가 '취소'를 누른 경우

    // 비활성화하여 중복 저장 방지
    saveButton.disabled = true;
    fileInput.disabled = true;
    showStatus('파일 저장 중... (팝업을 닫지 마세요!)', 'info');

    try {
      // 어떤 키(rabbit/turtle)와 어떤 URL 입력창을 비워야 하는지 결정
      const key = (fileInput.id === 'imageFileRabbit') ? 'userImageRabbit' : 'userImageTurtle';
      const urlInputToClear = (fileInput.id === 'imageFileRabbit') ? imageUrlRabbit : imageUrlTurtle;
      
      // File 객체와 함께 'undefined' URL을 전달하여 파일 저장을 강제
      await saveImage(key, undefined, file);
      
      // 저장이 성공하면, 연관된 URL 입력창을 비움
      urlInputToClear.value = '';
      
      showStatus('파일이 자동 저장되었습니다.', 'success');
      
    } catch (error) {
      console.error('파일 자동 저장 중 오류 발생:', error);
      showStatus('오류: 파일 저장 실패.', 'error');
    } finally {
      // (중요!) 처리가 끝나면 파일 입력을 초기화
      fileInput.value = ''; 
      
      // 버튼/입력창 활성화
      setTimeout(() => {
        if (masterToggle.checked) {
          saveButton.disabled = false;
          fileInput.disabled = false;
        }
        if (statusEl.textContent === '파일이 자동 저장되었습니다.') {
          statusEl.textContent = '';
        }
      }, 2000);
    }
  }
  // ✨✨✨ (새 함수 끝) ✨✨✨

  // --- 이벤트 리스너 및 초기화 ---

  // 1. 팝업 로드 시 저장된 설정 값 불러오기
  chrome.storage.local.get(
    ['userImageRabbit', 'userImageTurtle', 'isExtensionEnabled'], 
    (data) => {
      // Data URL(파일)이 저장되어 있으면, "(파일 저장됨)" 등으로 표시 (선택사항)
      // (여기서는 이전과 동일하게 http URL만 표시)
      if (data.userImageRabbit && data.userImageRabbit.startsWith('http')) {
        imageUrlRabbit.value = data.userImageRabbit;
      } else if (!data.userImageRabbit) {
        imageUrlRabbit.value = DEFAULT_RABBIT_URL;
      }

      if (data.userImageTurtle && data.userImageTurtle.startsWith('http')) {
        imageUrlTurtle.value = data.userImageTurtle;
      } else if (!data.userImageTurtle) {
        imageUrlTurtle.value = DEFAULT_TURTLE_URL;
      }
      
      const isEnabled = data.isExtensionEnabled !== false; 
      masterToggle.checked = isEnabled;
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

  // 3. ✨ (수정됨!) 파일 '선택' 시 자동 저장 리스너 연결
  imageFileRabbit.addEventListener('change', handleFileSelectAndSave);
  imageFileTurtle.addEventListener('change', handleFileSelectAndSave);

  // 4. '저장' 버튼 (이제 주로 URL 저장을 담당)
  saveButton.addEventListener('click', async () => {
    
    saveButton.disabled = true;
    // (파일 저장 중... 경고는 자동 저장이 하므로 제거)
    showStatus('URL 저장 중...', 'info');

    try {
      // (수정됨!) 'saveImage'는 이제 URL 입력창의 값'만' 신경 씀.
      // (파일 입력은 'handleFileSelectAndSave'가 처리하고 비웠기 때문)
      await saveImage('userImageRabbit', imageUrlRabbit.value, imageFileRabbit.files[0]);
      await saveImage('userImageTurtle', imageUrlTurtle.value, imageFileTurtle.files[0]);
      
      // (파일 입력창은 비울 필요 없음, 이미 자동 저장 후 비워짐)
      showStatus('설정이 저장되었습니다.', 'success');
      
    } catch (error) {
      console.error('URL 저장 중 오류 발생:', error);
      showStatus('오류: 저장이 실패했습니다.', 'error');
    } finally {
      // (로직 동일)
      saveButton.disabled = false;
      setTimeout(() => {
        if (masterToggle.checked) {
          saveButton.disabled = false;
        }
        if (statusEl.textContent === '설정이 저장되었습니다.' || statusEl.textContent === 'URL 저장 중...') {
          statusEl.textContent = '';
        }
      }, 2000);
    }
  });

  // 5. 리셋 버튼 (이전과 동일)
  resetButton.addEventListener('click', () => {
    chrome.storage.local.set({
        'userImageRabbit': DEFAULT_RABBIT_URL,
        'userImageTurtle': DEFAULT_TURTLE_URL
    }, () => {
      imageUrlRabbit.value = DEFAULT_RABBIT_URL;
      imageUrlTurtle.value = DEFAULT_TURTLE_URL;
      imageFileRabbit.value = '';
      imageFileTurtle.value = '';
      
      showStatus('설정이 기본값으로 초기화되었습니다.', 'success');
      setTimeout(() => statusEl.textContent = '', 2000);
    });
  });
});