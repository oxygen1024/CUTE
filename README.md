# 🐱💘 Prank Website — *Can You Follow My Moves?*

一個純前端嘅互動惡作劇網站：用戶以為自己玩緊普通「跟住做動作」挑戰，網站喺**每個動作影一張相**；完成之後畫面突然變成粉紅色，將所有唔同手勢嘅相**砌埋一張可愛大相**，每張相都自動戴上**貓耳**（仲有貓鼻、鬚同腮紅），再播放**超可愛音樂**同一聲「nya~」—— 原來係一個 Prank！

- ✅ 純 HTML / CSS / JavaScript，**唔使 Backend、Database、Login、付費 API**
- ✅ 可以直接部署去 **GitHub Pages**（HTTPS）
- ✅ 支援電腦、iPhone、Android（手機直向自動適應）
- ✅ 相片**只留喺用戶自己 Browser**；貓耳位置用 **MediaPipe 人臉偵測喺 Browser 本機計**，唔會上傳任何相片；**唔會用咪高峰**
- ✅ 原創可愛音樂同貓叫聲（冇版權問題）
- ✅ 最後係**一張 PNG 相**：可以撳「Save My Picture」或者長按相片儲存

---

## 📁 檔案結構

```
index.html                主頁面（4 個畫面 + 同意 / 錯誤視窗 + 卡通人物 SVG）
style.css                 所有樣式、動畫、卡通人物動作（Challenge Mode / Pink Mode）
script.js                 所有邏輯；最頂嘅 CONFIG 就係你要改嘅設定
assets/
  cute.mp3                預設背景音樂：原創可愛音樂盒小曲（無縫 loop）
  meow.mp3                原創「nya~」貓叫聲（相片砌好嗰下播一次）
  funny.mp3, romantic.mp3 後備音樂（原創），想用就改 CONFIG.music.src
  favicon.svg             網站圖示
  fonts/                  Fredoka + Pacifico 字型（SIL Open Font License）
  vendor/mediapipe/       MediaPipe 人臉偵測（本機運行，Apache-2.0）
tools/
  compose_cute.py         產生 cute.mp3
  compose_meow.py         產生 meow.mp3
  compose_funny.py        產生 funny.mp3
  compose_music.py        產生 romantic.mp3
.nojekyll                 叫 GitHub Pages 原封不動發佈檔案
```

## 🎬 流程

1. **歡迎畫面** —「Can You Follow My Moves?」+ START 掣（唔會透露 Prank）
2. **同意視窗** — 清楚講明會用前置鏡頭、每個動作影一張相、最後會砌成一張相播返、所有嘢只留喺 Browser、唔會錄聲
3. **動作挑戰** — 卡通人物示範 8 個動作；每個動作前 3 秒倒數，做動作期間圓圈倒數到「📸」就自動影相（白光 + 快門聲），下面相片列即時顯示縮圖；全程自動跳下一個
4. **完成** —「Challenge Complete!」→「Preparing Your Results...」（同時喺本機搵塊面，計貓耳位置）→ 柔和粉紅閃光
5. **可愛大相**（粉紅背景 + 波點 + 貓爪印 + 愛心 + 閃閃）：
   - 「Surprise! 💘」+「POV: You just fell in love 💗」
   - 每個手勢一格拍立得相，逐格「啵」一聲彈出嚟；每張相都戴住**突出相框嘅粉紅貓耳**、貓鼻、鬚、腮紅，下面有手寫字幕，角落有貼紙
   - 最後中間蓋一個「Gotcha! 💕」貓貓徽章 + 一聲「nya~」
   - 超可愛音樂一直 loop
6. **Watch Again / Try Again / Save My Picture**

---

## 💻 點樣本地測試

> ⚠️ **唔好直接 double-click 打開 `index.html`**（`file://`）。Browser 喺 `file://` 之下唔畀用鏡頭，人臉偵測亦載入唔到。

喺專案資料夾開一個本地伺服器，揀其中一個：

```bash
# 方法 1：Python（大部分電腦已經有）
python3 -m http.server 8080

# 方法 2：Node.js
npx serve .
```

然後用 Chrome / Edge / Safari / Firefox 打開 **http://localhost:8080**。`localhost` 會被 Browser 當成安全連線，所以可以用鏡頭。

**想用手機測試？** 手機打開 `http://192.168.x.x:8080` 係**唔得**嘅（唔係 HTTPS，Browser 會封鎖鏡頭）。最簡單係先部署去 GitHub Pages（下面），再用手機開個 `https://` 網址。

**快速測試小貼士：** 暫時將 `script.js` 入面 `CONFIG.prepSeconds` 同每個動作嘅 `seconds` 改細（例如 1），成個挑戰十幾秒就玩完。

---

## 🚀 點樣部署去 GitHub Pages

1. 將成個專案 push 上 GitHub repository（`index.html` 要喺 repo 最外層）。
2. 去 repository 嘅 **Settings → Pages**。
3. **Build and deployment → Source** 揀 **Deploy from a branch**。
4. **Branch** 揀 `main`（或者你嘅主要 branch），資料夾揀 **`/ (root)`**，按 **Save**。
5. 等 1–2 分鐘，頁面上方會顯示網址，例如 `https://你的帳戶.github.io/你的repo/`。
6. GitHub Pages 自動有 **HTTPS**，鏡頭可以正常使用。之後每次 push，網站都會自動更新。

---

## 🎵 點樣更換音樂同貓叫聲

**最簡單：** 用你自己嘅檔案直接覆蓋 `assets/cute.mp3`（背景音樂）或 `assets/meow.mp3`（貓叫聲），保持同一個檔名。

**或者改設定**（`script.js` 最頂嘅 CONFIG）：

```js
music: {
  src: "assets/cute.mp3",   // ← 換成你嘅檔案，例如 "assets/funny.mp3"
  volume: 0.8,              // 開始時音量 (0–1)
},
meow: { src: "assets/meow.mp3", enabled: true },   // enabled: false = 唔要貓叫
```

注意：

- 建議用 **MP3**（所有 Browser 包括 iPhone 都播到）。音樂會一直 loop，直到用戶離開或者靜音。
- **請只用你有權使用嘅音樂**（自己作、免版稅 / Creative Commons 而授權容許嘅歌）。
- 想改現有原創音樂：修改 `tools/compose_cute.py` / `tools/compose_meow.py`，然後執行
  `python3 tools/compose_cute.py cute.wav && ffmpeg -i cute.wav -b:a 128k assets/cute.mp3`（需要 Python + numpy + ffmpeg）。

---

## 🐱 點樣改貓耳 / 貓咪效果

```js
catFace: {
  ears: true,          // 貓耳
  nose: true,          // 貓鼻（要偵測到塊面先會畫）
  whiskers: true,      // 鬚
  blush: true,         // 腮紅
  earColor: "#ffd3e6", // 耳仔外面顏色
  earOutline: "#ff7eb6",
  earInner: "#ff5fa2", // 耳仔入面顏色
},
faceDetection: {
  enabled: true,                        // false = 唔用人臉偵測（貓耳會放喺估計位置）
  path: "assets/vendor/mediapipe/",
  minConfidence: 0.4,
  maxWaitSeconds: 6,                    // 網絡慢時最多額外等幾耐
},
```

- 人臉偵測檔案（約 19MB）喺用戶開始玩時就喺背景載入，玩完通常已經準備好。
- 某張相搵唔到塊面（例如用手遮住），會用其他相嘅平均位置放貓耳；全部都搵唔到就放喺畫面上方中間嘅估計位置。

---

## 🕺 點樣修改動作順序

喺 `script.js` 最頂搵 `CONFIG.actions`。**陣列嘅次序就係動作（同相片）嘅次序**，直接搬上搬落、刪除或者複製就得。每個動作影一張相：

```js
actions: [
  { pose: "raise-right", emoji: "🙋", title: "Raise your RIGHT hand", hint: "Reach up high — like you know the answer!", seconds: 5, caption: "Pick me!",    sticker: "✋" },
  { pose: "raise-left",  emoji: "🙋", title: "Raise your LEFT hand",  hint: "Now the other one — nice and high!",       seconds: 5, caption: "Me again~",   sticker: "🙌" },
  { pose: "wave",        emoji: "👋", title: "Wave BOTH hands",       hint: "Say hi to the camera!",                    seconds: 5, caption: "Hiii cutie!", sticker: "👋" },
  { pose: "heart",       emoji: "❤️", title: "Make a heart with both hands", hint: "Hold it in front of you",           seconds: 5, caption: "My heart",    sticker: "💗" },
  { pose: "point",       emoji: "👉", title: "Point both index fingers at your face", hint: "Who, me? 👉😊👈",          seconds: 5, caption: "Who, me?",    sticker: "🥺" },
  { pose: "smile",       emoji: "😁", title: "Smile at the camera",   hint: "Your biggest smile!",                      seconds: 4, caption: "So happy",    sticker: "✨" },
  { pose: "kiss",        emoji: "😘", title: "Blow a kiss to the camera", hint: "Mwah!",                                seconds: 4, caption: "Mwah!",       sticker: "💋" },
  { pose: "cup",         emoji: "🥺", title: "Hold your face with both hands", hint: "Make your cutest face!",          seconds: 5, caption: "Too cute!",   sticker: "🌸" },
],
```

| 欄位 | 用途 |
| --- | --- |
| `pose` | 卡通人物示範邊個動作（見下表） |
| `emoji` | 指示卡左邊嘅圖示 |
| `title` | 大字指示 |
| `hint` | 細字提示 |
| `seconds` | 呢個動作做幾多秒（唔寫就用 `actionSeconds`） |
| `prepSeconds` | （可選）呢個動作之前嘅倒數秒數 |
| `caption` | 最後大相入面，寫喺呢張相下面嘅手寫字幕 |
| `sticker` | 最後大相入面，貼喺呢張相角落嘅 emoji |

**卡通人物識做嘅動作 (`pose`)：**

| `pose` | 示範 |
| --- | --- |
| `raise-right` | 舉起右手（揮下隻手） |
| `raise-left` | 舉起左手 |
| `wave` | 雙手揮手 |
| `heart` | 雙手喺胸前做心形（有跳動嘅心） |
| `point` | 兩隻食指指住自己塊面 |
| `smile` | 叉腰大笑（有閃光） |
| `kiss` | 飛吻（手由嘴邊拋出，飛出心心） |
| `cup` | 雙手托住塊面扮可愛（左右搖） |

> 💡 鏡頭畫面同相片都係「鏡像」（好似照鏡），所以卡通人物喺畫面**右邊**舉手 = 用戶舉**右手**，用戶跟住做會好自然。
> 想加全新動作：喺 `style.css` 嘅 *Cartoon buddy* 部分仿照現有 `.buddy[data-pose="…"]` 加一組關節角度（`--sr-sh` 右肩、`--sr-el` 右手肘、`--sl-sh` 左肩、`--sl-el` 左手肘、`--sr-wr`/`--sl-wr` 手腕）。
> 動作數量唔一定要 8 個；大相會自動排版（8 張相 + 1 個徽章 = 3×3）。

---

## ⏱️ 點樣修改每個動作嘅時間

全部喺 `script.js` 嘅 `CONFIG`：

```js
introSeconds: 2,    // 第一個動作前「Get into the frame!」準備時間（0 = 唔要）
prepSeconds: 3,     // 每個動作前嘅 3‑2‑1 倒數
actionSeconds: 5,   // 預設每個動作秒數（個別動作可以用 seconds 覆蓋）
snapAt: 0.7,        // 喺動作做到 70% 時間嗰陣影相（0.2–0.95）
loadingSeconds: 2,  // 「Preparing Your Results...」Loading 時間
```

- 改個別動作：改嗰個動作嘅 `seconds`，例如 `seconds: 4`。
- 歡迎畫面同同意視窗顯示嘅時間同相片數量會自動更新。

---

## 💬 點樣修改 Prank 字幕

大相上面嘅文字喺 `CONFIG.picture`：

```js
picture: {
  width: 1080,                                  // 相嘅闊度（高度自動：手機相 2:3、電腦相 4:5）
  title: "Surprise! 💘",                        // 頂部大標題
  subtitle: "POV: You just fell in love 💗",    // 標題下面
  gotcha: "Gotcha! 💕",                         // 中間徽章大字
  gotchaSub: "You're so adorable!",             // 徽章細字
  footer: "💗 Can You Follow My Moves? 💗",     // 底部細字
},
```

每張相下面嘅手寫字幕同貼紙，就改 `CONFIG.actions` 入面嗰個動作嘅 `caption` / `sticker`。字幕太長會自動縮細字型。

---

## 💾 儲存

- **Save My Picture**：下載一張 PNG（1080 闊）。
- **iPhone / iPad**：會彈出分享選單，揀「**儲存影像**」就會存入「相片」。
- 亦可以**長按**（手機）或者**右鍵**（電腦）大相直接儲存。

## 🌐 Browser 支援

| Browser | 鏡頭 + 影相 + 貓耳大相 |
| --- | --- |
| Chrome / Edge（電腦、Android） | ✅ |
| Safari（Mac）14.1+ | ✅ |
| Safari（iPhone / iPad）iOS 14.3+ | ✅（較舊嘅 iPhone 如果載入唔到人臉偵測，貓耳會放喺估計位置，其他功能照常） |
| Firefox | ✅ |
| App 內置瀏覽器（IG / FB / WhatsApp / LINE） | ⚠️ 通常唔畀用鏡頭，網站會提示用 Safari / Chrome 打開 |

## 🔒 私隱

- 相片只係 Browser 記憶體入面嘅 Canvas，**冇任何上傳程式碼**、冇 Analytics、冇 Cookie。
- 人臉偵測（MediaPipe）檔案由你自己個網站提供，**喺用戶部機度運行**，相片唔會離開部機。
- **完全唔用咪高峰**；影完最後一張相即刻停止鏡頭（鏡頭燈會熄）。
- 撳 **Try Again**、離開或者 Reload 頁面，相片就會被清除。

> 🙏 **溫馨提示：** 呢個係搞氣氛嘅小玩意。網站開始前已經清楚講明會影相同播返；請只同願意玩嘅朋友玩，亦唔好喺未經對方同意下分享佢嘅相片。

## 🛠️ 疑難排解

| 問題 | 解決方法 |
| --- | --- |
| 鏡頭用唔到 | 確認係 `https://` 或 `localhost`；喺網址列鏡頭 / 🔒 圖示允許鏡頭；關閉 Zoom / Teams 等用緊鏡頭嘅 App |
| 貓耳位置唔準 | 影相時塊面要喺畫面入面、光線充足；搵唔到塊面嗰張會用估計位置 |
| 冇背景音樂 | 檢查 `assets/cute.mp3` 存在；iPhone 調高音量；Browser 阻止自動播放時會出「Play Surprise」掣，撳一下就得 |
| iPhone 冇音量拉桿 | iOS 唔畀網頁控制音量，請用手機側邊音量鍵（靜音掣仍然有效） |
| 手機熄 mon | 網站會用 Screen Wake Lock 防止熄 mon（支援嘅 Browser）；如果仍然熄，請暫時延長自動鎖定時間 |

## 📜 授權

- **音樂同音效 `assets/*.mp3`**：為呢個專案以程式（`tools/`）原創合成，冇使用任何第三方樣本，以 **CC0** 釋出，可自由使用及修改。
- **人臉偵測 `assets/vendor/mediapipe/`**：Google [MediaPipe](https://github.com/google-ai-edge/mediapipe) Tasks Vision 0.10.14 及 BlazeFace 模型，**Apache License 2.0**（全文見 `assets/vendor/mediapipe/LICENSE.txt`）。
- **字型**：[Fredoka](https://github.com/hafontia/Fredoka-One) 及 [Pacifico](https://github.com/googlefonts/Pacifico)，SIL Open Font License 1.1（授權全文見 `assets/fonts/`）。
- 其餘程式碼可自由修改使用。
