# 💘 Prank Website — *Can You Follow My Moves?*

一個純前端嘅互動惡作劇網站：用戶以為自己玩緊普通「跟住做動作」挑戰，網站喺**每個動作影一張相**；完成之後畫面突然變成粉紅色，將所有相片配上**搞笑卡通音樂**，用動畫串連成一段短片（相片逐張彈出 → 定格動畫「跳舞」→ 拼貼 + 「Gotcha! 💕」）—— 原來係一個 Prank！

- ✅ 純 HTML / CSS / JavaScript，**唔使 Backend、Database、Login、付費 API**
- ✅ 可以直接部署去 **GitHub Pages**（HTTPS）
- ✅ 支援電腦、iPhone、Android（手機直向自動適應）
- ✅ 相片**只留喺用戶自己 Browser 記憶體**，唔會上傳任何伺服器；**唔會用咪高峰**
- ✅ 原創搞笑卡通音樂（冇版權問題），每張相都夾正節拍
- ✅ 可以下載成條動畫片（粉紅背景、愛心、字幕、音樂），或者一張相片拼貼圖

---

## 📁 檔案結構

```
index.html              主頁面（4 個畫面 + 同意 / 錯誤 / 儲存提示視窗 + 卡通人物 SVG）
style.css               所有樣式、動畫、卡通人物動作（Challenge Mode / Pink Mode）
script.js               所有邏輯；最頂嘅 CONFIG 就係你要改嘅設定
assets/
  funny.mp3             預設背景音樂：原創搞笑卡通配樂（120 BPM，約 29 秒）
  romantic.mp3          後備音樂：原創浪漫鋼琴曲（想用就改 CONFIG.music.src）
  favicon.svg           網站圖示
  fonts/                Fredoka + Pacifico 字型（SIL Open Font License）
tools/
  compose_funny.py      產生 funny.mp3 嘅 Python 程式
  compose_music.py      產生 romantic.mp3 嘅 Python 程式
.nojekyll               叫 GitHub Pages 原封不動發佈檔案
```

## 🎬 流程

1. **歡迎畫面** —「Can You Follow My Moves?」+ START 掣（唔會透露 Prank）
2. **同意視窗** — 清楚講明會用前置鏡頭、每個動作影一張相、完成後會用動畫播返、所有嘢只留喺 Browser、唔會錄聲
3. **動作挑戰** — 卡通人物示範 8 個動作；每個動作前 3 秒倒數，做動作期間圓圈倒數到「📸」就自動影相（白光 + 快門聲），下面相片列即時顯示縮圖；全程自動跳下一個
4. **完成** —「Challenge Complete!」→「Preparing Your Results...」約 2 秒 Loading → 柔和粉紅閃光
5. **相片動畫（約 28 秒）**，粉紅背景 + 漂浮愛心 + 閃閃星星 + 搞笑卡通音樂：
   - 「Surprise! 💘」標題彈出 +「POV: You just fell in love 💗」
   - 每張相用唔同卡通動畫彈入（彈跳、滑入、跌落、旋轉、放大、翻轉、升起、果凍），配手寫字幕同貼紙，每張啱啱一小節音樂
   - **定格動畫**：所有相片快速連續播放，好似將唔同動作連成一段「跳舞」+「Look how cute you are!」
   - **拼貼**：全部相片一齊彈出 +「You're so adorable!」→ 大大個「Gotcha! 💕」印章
6. 播完之後：**Watch Again / Try Again / Save My Video**（另有「Save Photo Collage」）

---

## 💻 點樣本地測試

> ⚠️ **唔好直接 double-click 打開 `index.html`**（`file://`）。Browser 喺 `file://` 之下通常唔畀用鏡頭，而且音樂冇辦法混入下載影片。

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

## 🎵 點樣更換背景音樂

**最簡單：** 用你自己嘅歌直接覆蓋 `assets/funny.mp3`（保持同一個檔名）。

**或者改設定：** 將歌放入 `assets/`，然後改 `script.js` 最頂嘅 CONFIG：

```js
music: {
  src: "assets/funny.mp3",   // ← 換成你嘅檔案，例如 "assets/romantic.mp3"
  volume: 0.8,               // 開始時音量 (0–1)
  videoVolume: 0.9,          // 下載影片入面嘅音樂音量 (0–1)
  fadeOutSeconds: 1.2,       // 動畫完咗之後淡出秒數
},
```

**想相片夾正新歌嘅節拍？** 改 `CONFIG.show`：

```js
show: {
  bpm: 120,          // 新歌嘅 BPM（相片會跟住拍子輕輕跳）
  photoSeconds: 2,   // 每張相顯示幾耐；120 BPM 4/4 拍一小節 = 2 秒
  ...
}
```

注意：

- 建議用 **MP3**（所有 Browser 包括 iPhone 都播到）。
- 預設動畫長約 28 秒；歌短過都唔緊要，會自動 loop。
- **請只用你有權使用嘅音樂**（自己作、免版稅 / Creative Commons 而授權容許嘅歌）。唔好用未經授權嘅流行曲，尤其係如果用戶會將影片上載社交平台。
- 想改現有原創配樂：修改 `tools/compose_funny.py`，然後執行
  `python3 tools/compose_funny.py funny.wav && ffmpeg -i funny.wav -b:a 128k assets/funny.mp3`（需要 Python + numpy + ffmpeg）。

---

## 🕺 點樣修改動作順序

喺 `script.js` 最頂搵 `CONFIG.actions`。**陣列嘅次序就係動作（同相片）嘅次序**，直接搬上搬落、刪除或者複製就得。每個動作影一張相：

```js
actions: [
  { pose: "raise-right", emoji: "🙋", title: "Raise your RIGHT hand", hint: "Reach up high — like you know the answer!", seconds: 5, caption: "Pick me, pick me!", sticker: "✋" },
  { pose: "raise-left",  emoji: "🙋", title: "Raise your LEFT hand",  hint: "Now the other one — nice and high!",       seconds: 5, caption: "Me again, hehe",    sticker: "🙌" },
  { pose: "wave",        emoji: "👋", title: "Wave BOTH hands",       hint: "Say hi to the camera!",                    seconds: 5, caption: "Hiii cutie!",       sticker: "👋" },
  { pose: "heart",       emoji: "❤️", title: "Make a heart with both hands", hint: "Hold it in front of you",           seconds: 5, caption: "Here's my heart",   sticker: "💗" },
  { pose: "point",       emoji: "👉", title: "Point both index fingers at your face", hint: "Who, me? 👉😊👈",          seconds: 5, caption: "Who, me?",          sticker: "🥺" },
  { pose: "smile",       emoji: "😁", title: "Smile at the camera",   hint: "Your biggest smile!",                      seconds: 4, caption: "Smiling for you",   sticker: "✨" },
  { pose: "kiss",        emoji: "😘", title: "Blow a kiss to the camera", hint: "Mwah!",                                seconds: 4, caption: "Mwah!",             sticker: "💋" },
  { pose: "cup",         emoji: "🥺", title: "Hold your face with both hands", hint: "Make your cutest face!",          seconds: 5, caption: "Too cute!",         sticker: "🌸" },
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
| `caption` | 最後動畫入面，寫喺呢張相下面嘅手寫字幕 |
| `sticker` | 最後動畫入面，喺呢張相旁邊彈出嘅貼紙 emoji |

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
> 動作數量唔一定要 8 個；最後動畫會自動按相片數量調整（拼貼亦會自動排版）。

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

最後動畫嘅時間（`CONFIG.show`）：

```js
show: {
  bpm: 120,
  introSeconds: 2,          // 「Surprise!」標題
  photoSeconds: 2,          // 每張相
  flipbookSeconds: 4,       // 定格動畫（所有相片連續播放）
  flipbookFrameSeconds: 0.25, // 定格動畫每格幾耐（細啲 = 快啲）
  finaleSeconds: 4,         // 拼貼 + Gotcha 印章（印章喺一半時間出現）
  outroSeconds: 2,          // 結尾停留
  ...
}
```

- 改個別動作：改嗰個動作嘅 `seconds`，例如 `seconds: 4`。
- 歡迎畫面同同意視窗顯示嘅時間同相片數量會自動更新。
- 預設配樂係照住上面嘅時間作嘅（每張相一小節），改時間之後音樂可能唔再完全夾拍，但一樣可以播。

---

## 💬 點樣修改 Prank 字幕

所有動畫文字都喺 `CONFIG.show`：

```js
show: {
  title: "Surprise! 💘",                         // 頂部大標題
  introCaption: "POV: You just fell in love 💗", // 開場字幕
  flipbookCaption: "Look how cute you are!",     // 定格動畫字幕
  finaleCaption: "You're so adorable!",          // 拼貼字幕
  gotcha: "Gotcha! 💕",                           // 印章大字
  gotchaSub: "You just got pranked 😘",          // 印章下面細字
  footer: "💗 Can You Follow My Moves? 💗",      // 影片底部細字
},
```

每張相下面嘅手寫字幕同貼紙，就改 `CONFIG.actions` 入面嗰個動作嘅 `caption` / `sticker`。字幕太長會自動縮細字型。

---

## 💾 下載點運作

- **Save My Video**：第一次播動畫嘅同時，網站會用 **Canvas + MediaRecorder** 將動畫錄低，再用 **Web Audio** 混入背景音樂，所以播完一撳就即刻有得下載。
- 如果播放期間轉咗去其他分頁（Browser 會暫停畫面更新），撳 Save 時會自動**重播一次**重新製作，完成後再撳一次下載。
- 格式：支援 MP4 嘅 Browser（Safari、新版 Chrome / Edge）會出 **MP4**；其他（例如 Firefox）出 **WebM**。手機相片（直向）會出 **720×1280**，電腦 Webcam（橫向）會出 **960×960**。
- **Save Photo Collage**：下載一張 PNG，所有相片拼埋一齊，有粉紅背景同「Gotcha! 💕」。
- **iPhone / iPad**：會彈出分享選單，揀「**儲存影片**」/「**儲存影像**」就會存入「相片」。
- **唔支援錄製影片嘅 Browser**：撳 Save My Video 會顯示清楚提示同替代方案 —— 下載相片拼貼圖，或者用手機／電腦內置螢幕錄影錄低 *Watch Again*。

## 🌐 Browser 支援

| Browser | 鏡頭 + 影相 + 動畫 | 下載動畫影片 |
| --- | --- | --- |
| Chrome / Edge（電腦、Android） | ✅ | ✅ MP4（新版）/ WebM |
| Safari（Mac）14.1+ | ✅ | ✅ MP4 |
| Safari（iPhone / iPad）iOS 14.3+ | ✅ | ✅ MP4（新版 iOS）；唔得就自動提供相片拼貼 |
| Firefox | ✅ | ✅ WebM |
| App 內置瀏覽器（IG / FB / WhatsApp / LINE） | ⚠️ 通常唔畀用鏡頭 | 網站會提示用 Safari / Chrome 打開 |

## 🔒 私隱

- 相片只係 Browser 記憶體入面嘅 Canvas，**冇任何上傳程式碼**、冇 Analytics、冇 Cookie。
- **完全唔用咪高峰**；影完最後一張相即刻停止鏡頭（鏡頭燈會熄）。
- 撳 **Try Again**、離開或者 Reload 頁面，相片就會被清除。

> 🙏 **溫馨提示：** 呢個係搞氣氛嘅小玩意。網站開始前已經清楚講明會影相同播返；請只同願意玩嘅朋友玩，亦唔好喺未經對方同意下分享佢嘅相片或影片。

## 🛠️ 疑難排解

| 問題 | 解決方法 |
| --- | --- |
| 鏡頭用唔到 | 確認係 `https://` 或 `localhost`；喺網址列鏡頭 / 🔒 圖示允許鏡頭；關閉 Zoom / Teams 等用緊鏡頭嘅 App |
| 冇背景音樂 | 檢查 `assets/funny.mp3` 存在；iPhone 調高音量；Browser 阻止自動播放時會出「Play Surprise」掣，撳一下就得 |
| iPhone 冇音量拉桿 | iOS 唔畀網頁控制音量，請用手機側邊音量鍵（靜音掣仍然有效） |
| 下載影片冇音樂 | 一定要經 http(s) 開網站，唔好用 `file://` |
| 手機熄 mon | 網站會用 Screen Wake Lock 防止熄 mon（支援嘅 Browser）；如果仍然熄，請暫時延長自動鎖定時間 |

## 📜 授權

- **背景音樂 `assets/funny.mp3`、`assets/romantic.mp3`**：為呢個專案以程式（`tools/`）原創合成，冇使用任何第三方樣本，以 **CC0** 釋出，可自由使用及修改。
- **字型**：[Fredoka](https://github.com/hafontia/Fredoka-One) 及 [Pacifico](https://github.com/googlefonts/Pacifico)，SIL Open Font License 1.1（授權全文見 `assets/fonts/`）。
- 其餘程式碼可自由修改使用。
