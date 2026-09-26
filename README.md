# Focus V4 — Shinobi Study Village

A polished, responsive, frontend-only study planner built with plain HTML, CSS, and JavaScript.

The visual direction is an original ninja-inspired study village: forest green, warm cream, muted gold, village rooftops, mountains, and symbolic UI details.

## Project structure

```text
focus-v4-shinobi-study-village/
├── index.html
├── style.css
├── app.js
├── README.md
└── assets/
    ├── naruto-smile.jpg
    └── naruto-thumbs-up.jpg
```

## 1. Run it on Windows

No Node.js, Python, server, or installation is required.

1. Download and extract the project ZIP.
2. Open the folder.
3. Double-click `index.html`.
4. The app opens in Chrome, Edge, or another modern browser.

For easier editing, you can use the free Visual Studio Code, but the app itself still runs by opening `index.html` directly.

## 2. Local login and personalized greeting

On first launch, Focus V4 shows a local login screen.

- Enter a username.
- Enter any password with at least 4 characters.
- The password is **not saved**.
- The username is saved locally so the dashboard can say, for example, `Good evening, Rudraksh.`
- The logout button clears the local profile session.

This is a **frontend demo login**, not secure authentication. There is no server, account database, password verification, or encryption. Do not use a real password.

## 3. Features

### Mission Board
- Dynamic morning/afternoon/evening greeting.
- Personalized username greeting.
- Today's date.
- Completed, remaining, and completion percentage cards.
- Add, complete, and delete tasks.
- Each task has a title, subject, and due date.
- Task data is saved in `localStorage`.

### Training Calendar
- Monthly calendar.
- Previous/next month controls.
- Task indicators on dates containing tasks.
- Completed tasks have a distinct indicator.
- Current and selected days are highlighted.
- Selecting a date shows that day's tasks.

### Study Strategy
Enter subjects, available study hours, and a focus-block length. The app creates a practical schedule using local JavaScript rules with focus blocks and short breaks.

This is **not live AI** and makes no AI/API request.

### Logic Training
A five-item checklist covering:
- Breaking large tasks into smaller steps.
- Active recall.
- Explaining concepts simply.
- Reviewing mistakes.
- Protecting a focused study block.

Checklist state is saved locally.

### AI Sensei — Local Demo
The chat interface uses a small set of built-in JavaScript response rules for:
- Study planning.
- Revision routines.
- Focus/distraction control.
- Biology, Chemistry, and Physics study approaches.
- Using Focus V4.

It is deliberately **not presented as a general-purpose AI tutor** and should not be relied upon for arbitrary academic answers.

Chat history is saved locally and can be cleared with **Clear history**.

### Study audio / Spotify
The audio button and sidebar Spotify button open Spotify in a new browser tab using Spotify's public website.

This is intentionally a lightweight frontend integration: there is no Spotify API key, account connection, token storage, or backend. If you want a specific Spotify playlist later, replace the Spotify URL in `index.html` with the playlist's public URL.

### Character decoration
The two character images in `assets/` are the images supplied in the project request and are used as decorative dashboard/login artwork.

If you publish the site publicly, make sure you have the necessary rights or permission to redistribute any third-party artwork you include.

## 4. Where data is stored

The app uses the browser's `localStorage` for:

- Missions: `focusV4_tasks`
- Logic checklist: `focusV4_logic`
- Sensei chat: `focusV4_chat`
- Local username/session: `focusV4_profile`

Data stays in the **current browser/device**. It is not synchronized to another device.

The app never stores the login password.

If you clear browser site data, storage for the page can be removed and your saved app data may disappear.

The JavaScript also validates saved data and falls back safely if saved JSON is missing or malformed.

## 5. How to customize it

### Change colors
Open `style.css` and edit the variables near the top.

### Change the Sensei rules
Open `app.js` and find:

```js
function senseiReply(input) {
```

Add more keyword rules if you want. These are local rules, not a real language model.

### Change the checklist
At the top of `app.js`, edit the `logicHabits` array.

### Change the Spotify destination
In `index.html`, search for:

```html
https://open.spotify.com/
```

Replace it with a public Spotify playlist URL if you have one.

## 6. Free static publishing

The project has no backend requirement, so it can be hosted as a static site.

### GitHub Pages
1. Create a free GitHub account if needed.
2. Create a repository.
3. Upload **all files and the `assets` folder**.
4. In repository **Settings → Pages**, enable Pages from the main branch/root folder.
5. GitHub will provide the public site address.

### Netlify
1. Create a free Netlify account.
2. Deploy the project folder using Netlify's current static-site deployment flow.
3. No build command is required.

### Vercel
1. Create a free Vercel account.
2. Import the repository.
3. The plain HTML/CSS/JS files can be served without a backend or API key.

Provider interfaces and free-tier policies can change, so follow the provider's current setup screens when publishing.

## 7. Technical notes

- Plain HTML5, CSS3, and vanilla JavaScript.
- No framework.
- No build tool.
- No database.
- No application backend.
- No API keys.
- Responsive desktop/tablet/mobile layout.
- Semantic labels and accessible controls.
- CSS-generated village scenery.
- Local browser persistence.

## 8. Important limitations

This remains a frontend-only app. It cannot:

- Synchronize tasks across devices.
- Provide secure user accounts.
- Verify passwords through a server.
- Call a live AI model.
- Guarantee academic correctness for arbitrary questions.
- Store data on a cloud server.

Adding secure accounts, cloud sync, a real Spotify OAuth connection, or a live AI model would require external services and/or a backend and would no longer be a purely local static application.

## V4.2 updates

- **Spotify study audio now opens inside Focus V4** using Spotify's embedded player instead of redirecting the browser to Spotify.
- **Study Timer** is available from the dashboard and mobile header.
- Timer presets: 25, 40, and 50 minutes, plus a custom 1–180 minute duration.
- The timer runs entirely in browser JavaScript and requires no backend or API key.
- Spotify's embedded player is an external Spotify component; playback availability depends on Spotify and the selected public playlist.

## Spotify study audio

Focus V4 uses the official Spotify Embed player. Full-length music playback is controlled by Spotify and can require a Premium account. The app cannot bypass Spotify playback restrictions. If an embed plays only a short preview, that is a Spotify/browser/account restriction rather than a Focus V4 timer or audio bug. The iframe includes Spotify's required encrypted-media permission.


## Shinobi Reflex
A built-in offline 30-second reaction game with score, combo, three lives, and a browser-saved high score. It uses no external game service.
