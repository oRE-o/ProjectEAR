chrome.storage.local.get('isExtensionEnabled', (data) => {
  const isEnabled = data.isExtensionEnabled !== false;

  if (!isEnabled) {
    console.log('Elice Animation Replacer: 비활성화 상태입니다.');
    return; 
  }

  console.log('Elice Animation Replacer: 활성화 상태. 감시를 시작합니다.');

  const MAIN_CONTAINER_SELECTOR = '[class*="StyledRabbitAnimation"]';
  const DEFAULT_RABBIT_URL = 'https://i.imgur.com/bi29MUr.gif';
  const DEFAULT_TURTLE_URL = 'https://i.imgur.com/JbKF2DP.jpeg';
  const RABBIT_EXTRA_DURATION = 3000;
  
  let eacTimer = null; 
  let eacContainer = null; 

  const ANIMATION_CSS = `
    @keyframes eac-come-up-and-scale {
      0% { transform: translate(-50%, 50%) scale(0.5); opacity: 0; }
      50% { transform: translate(-50%, -60%) scale(1.1); opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    }
    @keyframes eac-go-down-and-fade {
      0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
      50% { transform: translate(-50%, -40%) scale(0.9); opacity: 0.5; }
      100% { transform: translate(-50%, 50%) scale(0.5); opacity: 0; }
    }
    
    .eac-custom-image {
      position: fixed;
      left: 50%;
      top: 50%;
      width: 70vmin; /* ✨ (수정됨!) 50vmin -> 70vmin으로 확대 */
      height: 70vmin; /* ✨ (수정됨!) 50vmin -> 70vmin으로 확대 */
      object-fit: contain;
      z-index: 999999;
    }
    .eac-custom-image.eac-come-and-go {
      animation: eac-come-up-and-scale 0.8s ease-out forwards;
    }
    .eac-custom-image.eac-go-down-and-fade-out {
      animation: eac-go-down-and-fade 0.5s ease-in forwards;
    }
  `;

  function injectAnimationCss() {
    const style = document.createElement('style');
    style.textContent = ANIMATION_CSS;
    document.head.appendChild(style);
  }

  function createPersistentContainer() {
    eacContainer = document.createElement('div');
    eacContainer.id = 'eac-container';
    eacContainer.style.display = 'none';
    eacContainer.style.position = 'absolute';
    eacContainer.style.width = '0';
    eacContainer.style.height = '0';
    document.body.appendChild(eacContainer);
  }

  async function injectImage(type) {
    if (!eacContainer) return;

    const existingImage = eacContainer.querySelector('.eac-custom-image');
    
    const key = (type === 'rabbit') ? 'userImageRabbit' : 'userImageTurtle';
    const defaultUrl = (type === 'rabbit') ? DEFAULT_RABBIT_URL : DEFAULT_TURTLE_URL;
    const data = await chrome.storage.local.get(key);
    const imageUrlToUse = data[key] || defaultUrl; 

    if (existingImage && existingImage.src === imageUrlToUse) {
      console.log(`Elice Animation Replacer: ${type} 재시작. 애니메이션 리셋.`);
      existingImage.classList.remove('eac-come-and-go', 'eac-go-down-and-fade-out');
      void existingImage.offsetWidth; 
      existingImage.classList.add('eac-come-and-go');
      
      eacContainer.style.display = 'block'; 
      return; 
    }

    console.log(`Elice Animation Replacer: ${type} 이미지 주입.`);
    
    eacContainer.innerHTML = ''; 

    const myImage = document.createElement('img');
    myImage.src = imageUrlToUse;
    myImage.className = 'eac-custom-image eac-come-and-go'; 
    
    eacContainer.appendChild(myImage);
    eacContainer.style.display = 'block'; 
  }

  function clearImage(targetDivToReset) {
    if (!eacContainer) return;

    const existingImage = eacContainer.querySelector('.eac-custom-image');
    if (existingImage) {
      console.log('Elice Animation Replacer: 이미지 제거 시작.');
      
      existingImage.classList.remove('eac-come-and-go');
      existingImage.classList.add('eac-go-down-and-fade-out'); 

      existingImage.addEventListener('animationend', () => {
          eacContainer.innerHTML = '';
          eacContainer.style.display = 'none';
          
          if (targetDivToReset) {
            targetDivToReset.style.opacity = '1';
          }
      }, { once: true }); 
    } else {
      if (targetDivToReset) {
        targetDivToReset.style.opacity = '1';
      }
    }
  }

  function handleAnimationChange(mutationsList, observer) {
    for (const mutation of mutationsList) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const targetDiv = mutation.target; 
        const type = targetDiv.dataset.eacType; 

        if (!targetDiv.classList.contains('u-no-display')) {
          
          if (eacTimer) {
            clearTimeout(eacTimer);
            eacTimer = null;
            console.log('Elice Animation Replacer: 보이기 신호 수신. 기존 숨김 타이머 취소.');
          }
          
          targetDiv.style.opacity = '0';
          
          injectImage(type);
        } 
        else {
          if (eacTimer) return;

          if (type === 'rabbit') {
            console.log(`Elice Animation Replacer: 토끼 숨김 신호 수신. ${RABBIT_EXTRA_DURATION}ms 지연 시작.`);
            eacTimer = setTimeout(() => {
              clearImage(targetDiv); 
              eacTimer = null; 
            }, RABBIT_EXTRA_DURATION);
            
          } else {
            clearImage(targetDiv);
          }
        }
      }
    }
  }

  function setupAnimationObservers(container) {
    if (container.dataset.eacInitialized) return;
    container.dataset.eacInitialized = 'true';

    console.log('Elice Animation Replacer: 타겟 컨테이너 발견. 하위 노드 감시자 설정.');
    
    const rabbitDiv = container.children[0]; 
    const turtleDiv = container.children[1]; 

    if (!rabbitDiv || !turtleDiv) {
      console.error('Elice Animation Replacer: 하위 애니메이션 div 구조를 찾을 수 없습니다.');
      return;
    }

    rabbitDiv.dataset.eacType = 'rabbit';
    turtleDiv.dataset.eacType = 'turtle';

    const attributeObserverOptions = { 
      attributes: true, 
      attributeFilter: ['class'] 
    };

    const rabbitObserver = new MutationObserver(handleAnimationChange);
    rabbitObserver.observe(rabbitDiv, attributeObserverOptions);

    const turtleObserver = new MutationObserver(handleAnimationChange);
    turtleObserver.observe(turtleDiv, attributeObserverOptions);
  }

  const mainObserver = new MutationObserver((mutationsList, observer) => {
    for (const mutation of mutationsList) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) { 
          if (node.matches(MAIN_CONTAINER_SELECTOR)) {
            setupAnimationObservers(node);
          }
          const container = node.querySelector(MAIN_CONTAINER_SELECTOR);
          if (container) {
            setupAnimationObservers(container);
          }
        }
      }
    }
  });
  
  createPersistentContainer(); 
  injectAnimationCss();      
  mainObserver.observe(document.body, { childList: true, subtree: true }); 

});