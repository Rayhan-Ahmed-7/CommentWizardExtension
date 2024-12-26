// Load apiKey from chrome storage
const _apiKey = async () => {
  return new Promise((resolve) => {
    chrome.storage.sync.get("apiKey", (data) => {
      if (!data.apiKey) {
        alert("Please set your OpenAI API key in the extension options.");
      }
      resolve(data.apiKey);
    });
  });
};

const observer = new MutationObserver(() => {
  Array.from(document.getElementsByClassName("comments-comment-texteditor"))
    .filter((commentBox) => !commentBox.hasAttribute("data-mutated"))
    .forEach((commentBox) => {
      commentBox.setAttribute("data-mutated", "true");
      addSuggestionButton(commentBox);
    });
});

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

observer.observe(document.body, { childList: true, subtree: true });

const addSuggestionButton = (commentBox) => {
  const button = document.createElement("button");
  button.classList.add(
    "artdeco-button",
    "artdeco-button--muted",
    "artdeco-button--tertiary",
    "artdeco-button--circle"
  );
  button.type = "button";
  //   button.innerHTML =
  //     '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-lightbulb-fill" viewBox="0 0 16 16"><path d="M2 6a6 6 0 1 1 10.174 4.31c-.203.196-.359.4-.453.619l-.762 1.769A.5.5 0 0 1 10.5 13h-5a.5.5 0 0 1-.46-.302l-.761-1.77a2 2 0 0 0-.453-.618A5.98 5.98 0 0 1 2 6m3 8.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1l-.224.447a1 1 0 0 1-.894.553H6.618a1 1 0 0 1-.894-.553L5.5 15a.5.5 0 0 1-.5-.5"/></svg>';
  button.innerHTML = generatorSvg;

  button.addEventListener("click", async () => {
    const editor = commentBox.querySelector(".ql-editor");

    if (!editor) {
      console.error("No .ql-editor found!");
      return;
    }

    // Create the loader element
    const loader = document.createElement("div");
    loader.className = "loading";
    loader.innerHTML = `
       <svg class="pl" width="240" height="240" viewBox="0 0 240 240">
         <circle class="pl__ring pl__ring--a" cx="120" cy="120" r="105" fill="none" stroke="#f42f25" stroke-width="20" stroke-dasharray="0 660" stroke-dashoffset="-330" stroke-linecap="round"></circle>
         <circle class="pl__ring pl__ring--b" cx="120" cy="120" r="35" fill="none" stroke="#f49725" stroke-width="20" stroke-dasharray="0 220" stroke-dashoffset="-110" stroke-linecap="round"></circle>
         <circle class="pl__ring pl__ring--c" cx="85" cy="120" r="70" fill="none" stroke="#255ff4" stroke-width="20" stroke-dasharray="0 440" stroke-dashoffset="0" stroke-linecap="round"></circle>
         <circle class="pl__ring pl__ring--d" cx="155" cy="120" r="70" fill="none" stroke="#f42582" stroke-width="20" stroke-dasharray="0 440" stroke-dashoffset="0" stroke-linecap="round"></circle>
       </svg>
     `;

    // Clear editor content and add loader
    editor.innerHTML = ""; // Clear existing content
    editor.appendChild(loader); // Show loader
    console.log("Loader added to editor:", loader.children);

    try {
      // Fetch suggestion
      // const suggestion = await fetchSuggestion(createPrompt(commentBox));
      await wait(2000);
      let suggestion = "alsdfj";
      console.log("Suggestion fetched:", suggestion);

      // Remove loader and update with suggestion
      editor.innerHTML = `<p>${suggestion}</p>`;
    } catch (error) {
      console.error("Error fetching suggestion:", error);
      editor.innerHTML = `<p style="color:red;">Failed to load suggestion. Please try again later.</p>`;
    }

    // commentBox.querySelector(
    //   ".ql-editor"
    // ).innerHTML = `<p>🌟 Good Morning! 🌟<br/>
    // May your day be filled with positivity, productivity, and peace. Embrace every opportunity, overcome every challenge, and spread kindness wherever you go. Remember, every little step brings you closer to your dreams. Have an amazing day ahead! 🌞✨</p>`;
  });
  const displayFlexElement = commentBox.querySelector(".display-flex");
  if (displayFlexElement) {
    displayFlexElement.prepend(button);
  } else {
    console.warn("Unable to find .display-flex element in the comment box.");
  }
};

const fetchSuggestion = async (prompt) => {
  const apiKey = await _apiKey();
  if (!apiKey) {
    return "";
  }
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    body: JSON.stringify({
      model: "gpt-4",
      messages: [
        {
          role: "developer",
          content:
            "You are an assistant, that writes replies to LinkedIn posts to other persons. Use the same language as of the text of the post you are recieving in the user's prompt. Please sound like a human being. Don't use hashtags, use emojis occasionally, don't repeat too many of the exact words, but simply create a brief and positive reply.  Maybe add something to the discussion. Be creative! You may mention the name of the author, if it's the name of a natural person. Don't mention the name if it's the name of a company or a LinkedIn group.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 1,
      max_tokens: 256,
      top_p: 0.7,
      frequency_penalty: 2,
      presence_penalty: 2,
    }),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  });
  return (await response.json()).choices[0].message.content.trim();
};
const createPrompt = (commentBox) => {
  // Get post details
  const post =
    commentBox.closest(".feed-shared-update-v2") ||
    commentBox.closest(".reusable-search__result-container");

  const author = post.querySelector(
    ".update-components-actor__name .visually-hidden"
  )?.innerText;
  const text = post.querySelector(
    ".feed-shared-inline-show-more-text"
  )?.innerText;

  let prompt = `${author}" wrote: ${text}`;

  // Optional: Get comment details
  const commentElement = commentBox.closest(".comments-comment-item");
  const commentAuthor = commentElement?.querySelector(
    ".comments-post-meta__name-text .visually-hidden"
  )?.innerText;
  const commentText = commentElement?.querySelector(
    ".comments-comment-item__main-content"
  )?.innerText;

  if (commentElement) {
    prompt += `\n${commentAuthor} replied: ${commentText}\nPlease write a reply to the reply with a maximum of 20 words.`;
  } else {
    prompt += `\nPlease write a reply to this post with a maximum of 40 words.`;
  }

  return prompt;
};
let generatorSvg = `<?xml version="1.0" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 20010904//EN"
 "http://www.w3.org/TR/2001/REC-SVG-20010904/DTD/svg10.dtd">
<svg version="1.0" xmlns="http://www.w3.org/2000/svg"
 width="18" height="18" viewBox="0 0 512.000000 512.000000"
 preserveAspectRatio="xMidYMid meet">

<g transform="translate(0.000000,512.000000) scale(0.100000,-0.100000)"
fill="#000000" stroke="none">
<path d="M3320 5110 c-100 -18 -218 -80 -239 -126 -26 -57 -15 -85 84 -230
117 -170 141 -194 196 -194 71 0 87 16 189 192 80 138 95 170 95 207 0 39 -5
47 -43 82 -67 59 -183 88 -282 69z m110 -151 c27 -6 50 -15 50 -19 0 -18 -112
-200 -121 -195 -12 8 -119 165 -119 175 0 9 71 37 110 43 14 2 26 5 27 6 1 0
25 -4 53 -10z"/>
<path d="M2325 4905 c-41 -40 -33 -64 56 -175 106 -131 134 -146 184 -95 40
40 32 65 -55 174 -103 130 -135 147 -185 96z"/>
<path d="M4655 4712 c-11 -1 -71 -51 -133 -110 -124 -118 -134 -141 -87 -187
41 -42 66 -33 163 54 107 96 152 146 152 170 0 24 -34 67 -57 73 -10 2 -27 2
-38 0z"/>
<path d="M2734 4426 c-50 -22 -74 -61 -74 -120 0 -28 11 -201 26 -385 21 -278
23 -336 12 -346 -7 -6 -134 -90 -283 -185 -148 -95 -280 -182 -292 -193 -51
-46 -51 -128 1 -176 15 -14 84 -41 187 -72 90 -27 171 -52 178 -55 10 -3 -295
-315 -881 -902 -628 -628 -899 -906 -904 -925 -10 -43 22 -81 71 -85 l38 -3
931 929 931 929 61 -18 61 -19 18 -59 c17 -58 17 -60 -3 -88 -11 -15 -137
-144 -281 -285 -143 -142 -265 -266 -271 -277 -5 -11 -10 -28 -10 -39 0 -28
45 -65 81 -65 27 0 63 32 293 262 l262 262 48 -163 c27 -90 55 -175 62 -190
22 -44 62 -68 110 -68 36 0 51 6 78 33 19 17 115 158 214 312 l181 281 375
-30 c415 -32 421 -31 457 28 42 69 36 83 -177 423 l-196 314 117 344 c131 385
132 389 69 444 -26 23 -44 31 -74 31 -50 0 -240 -67 -262 -92 -25 -28 -22 -70
5 -96 29 -27 58 -28 132 -2 32 11 62 20 66 20 5 0 -41 -146 -102 -324 -108
-318 -110 -324 -96 -362 8 -22 91 -162 186 -313 94 -150 169 -276 166 -279 -3
-4 -162 6 -352 21 -333 26 -348 26 -382 9 -30 -14 -66 -64 -212 -289 -96 -150
-178 -275 -181 -278 -2 -3 -44 127 -92 287 -49 161 -94 303 -102 315 -8 13
-25 30 -38 38 -12 8 -154 54 -314 102 l-292 87 274 182 c151 101 281 193 290
206 22 31 20 92 -9 453 -13 165 -23 300 -22 302 2 1 135 -81 297 -182 244
-153 301 -185 332 -185 56 0 229 64 256 96 27 31 23 69 -10 97 -28 24 -57 22
-154 -13 l-85 -30 -297 186 c-364 228 -358 226 -418 200z"/>
<path d="M1673 4078 c-121 -90 -169 -262 -122 -439 13 -52 44 -87 87 -100 35
-10 53 -6 209 45 94 31 183 66 197 77 36 28 51 88 33 131 -8 19 -74 95 -148
171 -134 137 -134 137 -180 137 -31 0 -55 -7 -76 -22z m129 -349 l-107 -36 -9
45 c-11 55 5 131 36 175 l22 30 82 -89 83 -89 -107 -36z"/>
<path d="M4755 3546 c-106 -62 -166 -103 -177 -122 -24 -39 -23 -95 3 -127 17
-23 110 -91 273 -201 53 -35 113 -36 155 0 36 30 83 125 101 203 26 110 -9
252 -77 311 -59 52 -92 45 -278 -64z m205 -102 c15 -44 8 -119 -17 -174 l-18
-41 -92 63 c-51 35 -92 65 -92 68 0 5 189 118 201 119 3 1 12 -15 18 -35z"/>
<path d="M4675 2582 c-44 -9 -71 -55 -55 -97 5 -13 55 -60 110 -105 75 -59
109 -80 131 -80 40 0 69 32 69 75 0 32 -8 42 -102 119 -105 87 -119 95 -153
88z"/>
<path d="M3682 2055 c-25 -21 -41 -56 -86 -193 -66 -198 -69 -231 -23 -277 26
-26 46 -35 104 -45 148 -27 274 4 367 90 49 45 72 96 61 137 -7 30 -93 122
-217 234 -82 74 -91 79 -132 79 -33 0 -52 -7 -74 -25z m258 -317 c0 -5 -24
-20 -52 -33 -54 -25 -148 -34 -176 -17 -11 7 8 80 53 200 3 9 34 -12 90 -63
47 -43 85 -82 85 -87z"/>
<path d="M2070 1900 c-8 -5 -388 -382 -845 -837 -456 -455 -849 -845 -873
-865 -35 -32 -49 -38 -86 -38 -81 0 -134 72 -106 145 6 17 112 131 234 255
123 124 227 235 230 247 13 43 -29 92 -79 93 -25 0 -62 -33 -261 -232 -248
-249 -273 -282 -281 -378 -14 -156 104 -284 262 -284 121 0 83 -33 1038 922
795 795 868 871 869 902 2 54 -60 97 -102 70z"/>
</g>
</svg>
`;
