# 💘 Romantic Prank Website — *Can You Follow My Moves?*

一個純前端嘅互動惡作劇網站：用戶以為自己玩緊普通「跟住做動作」挑戰，網站用 Webcam 錄低成個過程；完成之後畫面突然變成粉紅色浪漫風格、播浪漫音樂，再播返用戶頭先做嘅可愛動作 —— **Gotcha! 💕**

- ✅ 純 HTML / CSS / JavaScript，**唔使 Backend、Database、Login、付費 API**
- ✅ 可以直接部署去 **GitHub Pages**（HTTPS）
- ✅ 支援電腦、iPhone、Android（手機直向自動適應）
- ✅ 錄影**只留喺用戶自己 Browser 記憶體**，唔會上傳任何伺服器
- ✅ 可以下載有粉紅背景、愛心、字幕同背景音樂嘅「浪漫版」影片

---

## 📁 檔案結構

```
index.html              主頁面（4 個畫面 + 同意 / 錯誤 / 儲存提示視窗 + 卡通人物 SVG）
style.css               所有樣式、動畫、卡通人物動作（Challenge Mode / Romantic Mode）
script.js               所有邏輯；最頂嘅 CONFIG 就係你要改嘅設定
assets/
  romantic.mp3          背景音樂（原創，可自由使用，見下面「授權」）
  favicon.svg           網站圖示
  fonts/                Fredoka + Pacifico 字型（SIL Open Font License）
tools/
  compose_music.py      產生 romantic.mp3 嘅 Python 程式（想改旋律先需要）
.nojekyll               叫 GitHub Pages 原封不動發佈檔案
```

## 🎬 流程

1. **歡迎畫面** —「Can You Follow My Moves?」+ START 掣（唔會透露 Prank）
2. **同意視窗** — 清楚講明會用前置鏡頭錄影、完成後會播返、所有嘢只留喺 Browser；可選擇係咪錄埋聲
3. **動作挑戰** — 卡通人物示範 8 個動作，每個動作前 3 秒倒數、做 4–5 秒，頂部進度條、REC 指示，全自動跳下一個
4. **完成** —「Challenge Complete!」→「Preparing Your Results...」約 2 秒 Loading → 柔和粉紅閃光
5. **Romantic Reveal** — 粉紅漸變背景、漂浮愛心、閃閃星星、浪漫音樂、自動播放錄影 + 搞笑字幕
6. 播完之後：**Watch Again / Try Again / Save My Video**

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

**快速測試小貼士：** 暫時將 `script.js` 入面 `CONFIG.prepSeconds` 同每個動作嘅 `seconds` 改細（例如 1），成個流程十幾秒就玩完。

---

## 🚀 點樣部署去 GitHub Pages

1. 將成個專案 push 上 GitHub repository（`index.html` 要喺 repo 最外層）。
2. 去 repository 嘅 **Settings → Pages**。
3. **Build and deployment → Source** 揀 **Deploy from a branch**。
4. **Branch** 揀 `main`（或者你嘅主要 branch），資料夾揀 **`/ (root)`**，按 **Save**。
5. 等 1–2 分鐘，頁面上方會顯示網址，例如 `https://你的帳戶.github.io/你的repo/`。
6. GitHub Pages 自動有 **HTTPS**，鏡頭可以正常使用。之後每次 push，網站都會自動更新。

---

## 🎵 點樣更換浪漫歌曲

**最簡單：** 用你自己嘅歌直接覆蓋 `assets/romantic.mp3`（保持同一個檔名）。

**或者改設定：** 將歌放入 `assets/`，然後改 `script.js` 最頂嘅 CONFIG：

```js
music: {
  src: "assets/my-love-song.mp3", // ← 換成你嘅檔案
  volume: 0.8,                     // 開始時音量 (0–1)
  videoVolume: 0.9,                // 下載影片入面嘅音樂音量 (0–1)
  fadeOutSeconds: 2,               // 影片播完後淡出秒數
},
```

注意：

- 建議用 **MP3**（所有 Browser 包括 iPhone 都播到）。
- 首歌最好長過錄影（預設大約 64 秒）；短過都唔緊要，會自動 loop。
- **請只用你有權使用嘅音樂**（自己作、免版稅 / Creative Commons 而授權容許嘅歌）。唔好用未經授權嘅流行曲，尤其係如果用戶會將影片上載社交平台。
- 想改現有原創音樂嘅旋律／速度：修改 `tools/compose_music.py`，然後執行
  `python3 tools/compose_music.py romantic.wav && ffmpeg -i romantic.wav -b:a 128k assets/romantic.mp3`（需要 Python + numpy + ffmpeg）。

---

## 🕺 點樣修改動作順序

喺 `script.js` 最頂搵 `CONFIG.actions`。**陣列嘅次序就係動作嘅次序**，直接搬上搬落、刪除或者複製就得：

```js
actions: [
  { pose: "raise-right", emoji: "🙋", title: "Raise your RIGHT hand", hint: "Reach up high — like you know the answer!", seconds: 5 },
  { pose: "raise-left",  emoji: "🙋", title: "Raise your LEFT hand",  hint: "Now the other one — nice and high!",       seconds: 5 },
  { pose: "wave",        emoji: "👋", title: "Wave BOTH hands",       hint: "Say hi to the camera!",                    seconds: 5 },
  { pose: "heart",       emoji: "❤️", title: "Make a heart with both hands", hint: "Hold it in front of you",           seconds: 5 },
  { pose: "point",       emoji: "👉", title: "Point both index fingers at your face", hint: "Who, me? 👉😊👈",          seconds: 5 },
  { pose: "smile",       emoji: "😁", title: "Smile at the camera",   hint: "Your biggest smile!",                      seconds: 4 },
  { pose: "kiss",        emoji: "😘", title: "Blow a kiss to the camera", hint: "Mwah!",                                seconds: 4 },
  { pose: "cup",         emoji: "🥺", title: "Hold your face with both hands", hint: "Make your cutest face!",          seconds: 5 },
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

> 💡 鏡頭畫面係「鏡像」顯示（好似照鏡），所以卡通人物喺畫面**右邊**舉手 = 用戶舉**右手**，用戶跟住做會好自然。
> 想加全新動作：喺 `style.css` 嘅 *Cartoon buddy* 部分仿照現有 `.buddy[data-pose="…"]` 加一組關節角度（`--sr-sh` 右肩、`--sr-el` 右手肘、`--sl-sh` 左肩、`--sl-el` 左手肘、`--sr-wr`/`--sl-wr` 手腕）。

---

## ⏱️ 點樣修改每個動作嘅時間

全部喺 `script.js` 嘅 `CONFIG`：

```js
introSeconds: 2,    // 第一個動作前「Get into the frame!」準備時間（0 = 唔要）
prepSeconds: 3,     // 每個動作前嘅 3‑2‑1 倒數
actionSeconds: 5,   // 預設每個動作秒數（個別動作可以用 seconds 覆蓋）
loadingSeconds: 2,  // 「Preparing Your Results...」Loading 時間
endCard: { title: "Gotcha! 💕", subtitle: "You just got romantically pranked 😘", seconds: 2.2 },
```

- 改個別動作：改嗰個動作嘅 `seconds`，例如 `seconds: 4`。
- 歡迎畫面同同意視窗顯示嘅「about 1 min」會自動按總時間更新。

---

## 💬 點樣修改 Prank 字幕

`script.js` 嘅 `CONFIG.captions`：

```js
captions: [
  { text: "POV: You just fell in love 💗", from: 0.0,  to: 0.27 },
  { text: "Look how cute you are!",        from: 0.27, to: 0.52 },
  { text: "You're so adorable!",           from: 0.52, to: 0.78 },
  { text: "Gotcha! 💕",                    from: 0.78, to: 1.0  },
],
```

- `from` / `to` 係**影片長度嘅比例**（0 = 開頭、0.5 = 一半、1 = 結尾），所以就算改咗動作數量或者時間，字幕都會自動對得返。
- 想加字幕：加多一行，調整 `from` / `to` 唔好重疊就得。
- 字幕會用彈出動畫 + 閃光效果顯示，亦會畫入下載影片。

其他可以改嘅文字：

| 設定 | 位置 |
| --- | --- |
| `revealTitle` | Prank 畫面頂部大標題（預設 `Surprise! 💘`） |
| `endCard` | 影片播完彈出嘅「Gotcha! 💕」同下載影片結尾卡 |
| `videoFooter` | 下載影片底部嘅細字 |
| `photoCaption` | 「相片卡」替代方案用嘅字幕 |

---

## 💾 下載影片點運作

- 第一次播放 Prank 影片嘅同時，網站會用 **Canvas** 即時合成「浪漫版」影片（粉紅背景 + 愛心 + 星星 + 字幕 + 結尾卡），再用 **Web Audio** 混入背景音樂（同埋用戶有選擇錄聲嘅話，佢把聲），用 **MediaRecorder** 錄成檔案。所以播完一撳 **Save My Video** 就即刻有得下載。
- 如果播放期間轉咗去其他分頁（Browser 會暫停畫面更新），撳 Save 時會自動**重播一次**重新製作，完成後再撳一次下載。
- 格式：支援 MP4 嘅 Browser（Safari、新版 Chrome / Edge）會出 **MP4**；其他（例如 Firefox）出 **WebM**。
- **iPhone / iPad**：會彈出分享選單，揀「**儲存影片**」就會存入「相片」。
- **唔支援合成影片嘅 Browser**：會顯示清楚提示同替代方案 —— 下載「**浪漫相片卡**」（有粉紅框、愛心同字幕嘅圖片），或者用手機／電腦內置螢幕錄影錄低 *Watch Again*。

## 🌐 Browser 支援 & 格式差異

| Browser | 錄影 | 下載浪漫版影片 |
| --- | --- | --- |
| Chrome / Edge（電腦、Android） | ✅ WebM | ✅ MP4（新版）/ WebM |
| Safari（Mac） 14.1+ | ✅ MP4 | ✅ MP4 |
| Safari（iPhone / iPad）iOS 14.3+ | ✅ MP4 | ✅ MP4（新版 iOS）；舊版顯示替代方案 |
| Firefox | ✅ WebM | ✅ WebM |
| App 內置瀏覽器（IG / FB / WhatsApp / LINE） | ⚠️ 通常唔畀用鏡頭 | 網站會提示用 Safari / Chrome 打開 |

程式會用 `MediaRecorder.isTypeSupported()` 自動揀每個 Browser 支援嘅格式；Chrome WebM 冇片長資料嘅問題亦已自動處理。

## 🔒 私隱

- 錄影只係 Browser 記憶體入面嘅 Blob，**冇任何上傳程式碼**、冇 Analytics、冇 Cookie。
- 錄完即刻停止 Webcam Tracks（鏡頭燈會熄）。
- 撳 **Try Again**、離開或者 Reload 頁面，錄影就會被清除。
- 預設唔錄聲；用戶要自己剔「Also record sound」先會用咪。

> 🙏 **溫馨提示：** 呢個係搞氣氛嘅小玩意。網站開始前已經清楚講明會錄影同播返；請只同願意玩嘅朋友玩，亦唔好喺未經對方同意下分享佢嘅影片。

## 🛠️ 疑難排解

| 問題 | 解決方法 |
| --- | --- |
| 鏡頭用唔到 | 確認係 `https://` 或 `localhost`；喺網址列鏡頭 / 🔒 圖示允許鏡頭；關閉 Zoom / Teams 等用緊鏡頭嘅 App |
| 冇背景音樂 | 檢查 `assets/romantic.mp3` 存在；iPhone 調高音量；Browser 阻止自動播放時會出「Play Surprise」掣，撳一下就得 |
| iPhone 冇音量拉桿 | iOS 唔畀網頁控制音量，請用手機側邊音量鍵（靜音掣仍然有效） |
| 下載影片冇音樂 | 一定要經 http(s) 開網站，唔好用 `file://` |
| 手機熄 mon | 網站會用 Screen Wake Lock 防止熄 mon（支援嘅 Browser）；如果仍然熄，請暫時延長自動鎖定時間 |

## 📜 授權

- **背景音樂 `assets/romantic.mp3`**：為呢個專案以程式（`tools/compose_music.py`）原創合成，冇使用任何第三方樣本，以 **CC0** 釋出，可自由使用及修改。
- **字型**：[Fredoka](https://github.com/hafontia/Fredoka-One) 及 [Pacifico](https://github.com/googlefonts/Pacifico)，SIL Open Font License 1.1（授權全文見 `assets/fonts/`）。
- 其餘程式碼可自由修改使用。
