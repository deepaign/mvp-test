import React, { useEffect } from 'react';
import './Homepage.css';

// 引入三框對話模式展示組件
import ThreeChatBoxes from './ThreeChatBoxes';

function Homepage({ onLoginClick }) {
  // 添加動畫效果與滾動檢測
  useEffect(() => {
    // 創建並添加 canvas 元素到動畫容器
    const animationContainer = document.getElementById('animation-container');
    if (animationContainer) {
      // 檢查是否為移動設備
      if (!/Android|webOS|iPhone|iPod|BlackBerry/i.test(navigator.userAgent)) {
        // 創建 canvas 元素
        const canvas = document.createElement('canvas');
        animationContainer.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight * 0.9; // 設置為視窗高度的 90%
        ctx.lineWidth = 0.3;
        ctx.strokeStyle = 'rgba(150, 150, 150, 0.8)';

        // 滑鼠位置
        let mousePosition = {
          x: 30 * canvas.width / 100,
          y: 30 * canvas.height / 100
        };

        // 點的設定
        const dots = {
          nb: 250,
          distance: 100,
          d_radius: 150,
          array: []
        };
        
        // 添加文字漸變效果的變數
        let textOpacity = 0;
        const fadeInSpeed = 0.005; // 控制文字淡入速度

        // 顏色相關函數
        function colorValue(min) {
          return Math.floor(Math.random() * 255 + min);
        }
        
        function createColorStyle(r, g, b) {
          return 'rgba(' + r + ',' + g + ',' + b + ', 0.8)';
        }
        
        function mixComponents(comp1, weight1, comp2, weight2) {
          return (comp1 * weight1 + comp2 * weight2) / (weight1 + weight2);
        }
        
        function averageColorStyles(dot1, dot2) {
          const color1 = dot1.color;
          const color2 = dot2.color;
          
          const r = mixComponents(color1.r, dot1.radius, color2.r, dot2.radius);
          const g = mixComponents(color1.g, dot1.radius, color2.g, dot2.radius);
          const b = mixComponents(color1.b, dot1.radius, color2.b, dot2.radius);
          return createColorStyle(Math.floor(r), Math.floor(g), Math.floor(b));
        }
        
        function Color(min) {
          min = min || 0;
          this.r = colorValue(min);
          this.g = colorValue(min);
          this.b = colorValue(min);
          this.style = createColorStyle(this.r, this.g, this.b);
        }

        // 點的定義
        function Dot() {
          this.x = Math.random() * canvas.width;
          this.y = Math.random() * canvas.height;
          this.vx = -.5 + Math.random();
          this.vy = -.5 + Math.random();
          this.radius = Math.random() * 2;
          this.color = new Color();
        }

        Dot.prototype = {
          draw: function() {
            ctx.beginPath();
            ctx.fillStyle = this.color.style;
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
            ctx.fill();
          }
        };

        // 繪製文字的函數
        function drawText() {
          if (textOpacity < 1) {
            textOpacity += fadeInSpeed;
          }
          
          ctx.save();
          // 繪製主標題 POLIFY
          ctx.font = "italic bold 80px 'Arial', sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          
          // 白色文字在漸層背景上更清楚
          ctx.fillStyle = "rgba(255, 255, 255, " + textOpacity + ")";
          ctx.fillText("POLIFY", canvas.width/2, canvas.height/2 - 40);
          
          // 發光效果
          ctx.strokeStyle = "rgba(255, 255, 255, " + textOpacity * 0.8 + ")";
          ctx.lineWidth = 2;
          ctx.strokeText("POLIFY", canvas.width/2, canvas.height/2 - 40);
          
          // 第一行副標題
          ctx.shadowBlur = 0;
          ctx.font = "bold 24px 'Arial', sans-serif";
          ctx.fillStyle = "rgba(255, 255, 255, " + (textOpacity * 0.9) + ")";
          ctx.fillText("歡迎使用智能選服幕僚系統", canvas.width/2, canvas.height/2 + 20);
          
          // 第二行副標題
          ctx.font = "normal 18px 'Arial', sans-serif";
          ctx.fillStyle = "rgba(255, 255, 255, " + (textOpacity * 0.8) + ")";
          ctx.fillText("連結民眾與政治人物，提供即時服務與政績展示", canvas.width/2, canvas.height/2 + 50);
          
          ctx.restore();
        }

        // 創建點
        function createDots() {
          for(let i = 0; i < dots.nb; i++) {
            dots.array.push(new Dot());
          }
        }

        // 移動點
        function moveDots() {
          for(let i = 0; i < dots.nb; i++) {
            const dot = dots.array[i];

            if(dot.y < 0 || dot.y > canvas.height) {
              dot.vy = -dot.vy;
            } else if(dot.x < 0 || dot.x > canvas.width) {
              dot.vx = -dot.vx;
            }
            dot.x += dot.vx;
            dot.y += dot.vy;
          }
        }

        // 連接點
        function connectDots() {
          for(let i = 0; i < dots.nb; i++) {
            for(let j = 0; j < dots.nb; j++) {
              const i_dot = dots.array[i];
              const j_dot = dots.array[j];

              if((i_dot.x - j_dot.x) < dots.distance && (i_dot.y - j_dot.y) < dots.distance 
                && (i_dot.x - j_dot.x) > -dots.distance && (i_dot.y - j_dot.y) > -dots.distance) {
                if((i_dot.x - mousePosition.x) < dots.d_radius && (i_dot.y - mousePosition.y) < dots.d_radius 
                  && (i_dot.x - mousePosition.x) > -dots.d_radius && (i_dot.y - mousePosition.y) > -dots.d_radius) {
                  ctx.beginPath();
                  ctx.strokeStyle = averageColorStyles(i_dot, j_dot);
                  ctx.moveTo(i_dot.x, i_dot.y);
                  ctx.lineTo(j_dot.x, j_dot.y);
                  ctx.stroke();
                  ctx.closePath();
                }
              }
            }
          }
        }

        // 繪製點
        function drawDots() {
          for(let i = 0; i < dots.nb; i++) {
            const dot = dots.array[i];
            dot.draw();
          }
        }

        // 動畫循環
        function animateDots() {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          moveDots();
          connectDots();
          drawDots();
          drawText();
          requestAnimationFrame(animateDots);
        }

        // 事件監聽
        canvas.addEventListener('mousemove', function(e) {
          mousePosition.x = e.pageX;
          mousePosition.y = e.pageY;
        });

        canvas.addEventListener('mouseleave', function(e) {
          mousePosition.x = canvas.width / 2;
          mousePosition.y = canvas.height / 2;
        });
        
        // 響應式調整
        window.addEventListener('resize', function() {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight * 0.9;
          dots.array = [];
          createDots();
        });

        // 啟動動畫
        createDots();
        requestAnimationFrame(animateDots);
      }
    }

    // 滾動動畫效果
    const scrollEffect = () => {
      const sections = document.querySelectorAll('.fade-in-section');
      
      sections.forEach(section => {
        // 獲取元素相對於視窗的位置
        const sectionTop = section.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;
        
        // 當元素進入視窗的 80% 位置時顯示
        if (sectionTop < windowHeight * 0.8) {
          section.classList.add('is-visible');
        }
      });
    };
    
    // 頁面加載時先執行一次，處理已在視窗內的元素
    scrollEffect();
    
    // 添加滾動事件監聽器
    window.addEventListener('scroll', scrollEffect);
    
    // 添加滾動提示點擊事件，點擊後滾動到內容區域
    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollIndicator) {
      scrollIndicator.addEventListener('click', () => {
        const contentSection = document.querySelector('.card-container');
        if (contentSection) {
          contentSection.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }
    
    // 在組件卸載時清理事件監聽器
    return () => {
      window.removeEventListener('scroll', scrollEffect);
    };
  }, []); // 只在組件掛載時執行一次

  return (
    <main>
      {/* 動畫區域 */}
      <div id="animation-container" className="animation-container">
        {/* 下滾提示 */}
        <div className="scroll-indicator">▼</div>
      </div>
      
      {/* 卡片區塊 - 添加淡入效果 */}
      <div className="card-container fade-in-section">
        {/* 左側卡片：Line 官方帳號 */}
        <div className="card">
          <h2>加入我們的 Line 官方帳號</h2>
          <p>請掃下方 QR Code，立即加入我們的 Line 官方帳號，隨時掌握最新資訊，並可直接透過 Line 提出您的需求與建議。</p>
          
          <div className="qr-code">
            {/* 這裡放置 QR Code 圖片 */}
            <div className="qr-placeholder">
              <div className="qr-top-left"></div>
              <div className="qr-top-right"></div>
              <div className="qr-center"></div>
              <div className="qr-bottom-left"></div>
              <div className="qr-dots"></div>
            </div>
          </div>
          
          <button className="green-button" onClick={() => alert('即將開啟最新動態頁面')}>
            <span className="icon-chat"></span>
            查看最新動態
          </button>
        </div>

        {/* 右側卡片：系統功能介紹 */}
        <div className="card">
          <h2>系統功能介紹</h2>
          
          <div className="feature-list">
            <div className="feature-item">
              <span className="icon-check"></span>
              <div className="feature-content">
                <h3>民眾陳情服務</h3>
                <p>透過 Line 受理民眾陳情，快速提交您的陳情需求，系統自動分類並追蹤處理進度。</p>
              </div>
            </div>
            
            <div className="feature-item">
              <span className="icon-check"></span>
              <div className="feature-content">
                <h3>法律諮詢</h3>
                <p>提供基本法律諮詢服務，解答民眾常見法律問題，必要時將介專業律師協助。</p>
              </div>
            </div>
            
            <div className="feature-item">
              <span className="icon-check"></span>
              <div className="feature-content">
                <h3>政績展示</h3>
                <p>查看最新政績與活動資訊，了解我們為您服務所做的努力與成果。</p>
              </div>
            </div>
            
            <div className="feature-item">
              <span className="icon-check"></span>
              <div className="feature-content">
                <h3>進度追蹤</h3>
                <p>隨時查詢您提交的陳情案件處理進度，系統會主動通知最新狀態更新。</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Line 機器人功能展示區塊 - 添加三框對話模式 */}
      <section className="chatbot-demo fade-in-section">
        <h2>Line 機器人功能展示</h2>
        
        {/* 使用三框對話模式展示組件 */}
        <ThreeChatBoxes />
      </section>
    </main>
  );
}

export default Homepage;