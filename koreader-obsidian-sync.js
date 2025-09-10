const quotesSectionHeading = "### 💬 Favorite quotes";
const charactersSectionHeading = "## 👤 Characters";
const loreSectionHeading = "## 🏰 🐉 Lore";
const chapterSectionHeading = "## 📕 Chapters";
const quoteCalloutStart = "> [!quote]\n> \“";
const funnyMomentsCalloutStart = "> [!example]- Funny moments";
const memorableMomentsHeading = "### 🎭 Memorable moments";
const YAMLStartedBook = "started";
const YAMLCompletedBook = "completed";
const funnyHighlightColor = "yellow";
const importantHighlightColor = "red";
const quoteHighlightColor = "blue";
const memorableMomentHighlightColor = "orange";
const characterHighlightColor = "cyan";
const loreHighlightColor = "olive";
const KOReaderPath = "Books/KOReader_highlights";

function getToBottomOfSection(content, sectionName) {
  // Find the next heading or the end of the content
  const lines = content.split('\n');
  startIndex = lines.indexOf(sectionName) + 1;
  for (let i = startIndex; i < lines.length; i++) {
    if (lines[i].startsWith('#')) {
      return i - 1;
    }
  }
  return lines.length - 1; // If no more headings, return the last line
}

function goToBottomOfCallout(content, calloutTitleLine) {
  const lines = content.split('\n');
  startIndex = lines.indexOf(calloutTitleLine) + 1;
  for (let i = startIndex; i < lines.length; i++) {
    if (!lines[i].startsWith('>')) {
      return i;
    }
  }
  return lines.length - 1;
}

function addToCallout(content, calloutTitleLine, text) {
  let lines = content.split("\n");
  let bottomOfCalloutIndex = goToBottomOfCallout(content, calloutTitleLine);
  let newLines = text.split("\n").map(line => "> " + line);
  lines.splice(bottomOfCalloutIndex, 0, ...newLines);
  lines.splice(bottomOfCalloutIndex, 0, "> \n> ")


  return lines.join("\n");
}

function addToFunnyMoments(content, entry) {
  // if the funny moment exists already, exit
  regex = new RegExp(entry.text);
  if (regex.test(content)) {
    return content;
  }
  let text = "Page " + entry.pageno + ":\n" + entry.text;
  if (entry.note) {
    text += "\nMy notes: " + entry.note;
  }
  content = addToCallout(content, funnyMomentsCalloutStart, text);
  return content;
}


function addQuoteCallout(content, quote, quoteNote) {
  // try and find first few words in the text
  // if quote already exists, exit
  regex = new RegExp(quote)
  if (regex.test(content)) {
    return content;
  }
  callout = quoteCalloutStart;
  quoteList = quote.split('\n');
  callout += quoteList[0];
  quoteList.slice(1).forEach(function (str) {
    callout += "\n" + "> " + str;
  });
  callout += "\”";
  if (quoteNote) {
    callout += "\n> > " + quoteNote;
  }
  callout += "\n";

  // callout is ready, now we can add it at the right spot

  lineIndex = getToBottomOfSection(content, quotesSectionHeading);
  contentList = content.split('\n');
  contentList[lineIndex] += "\n" + callout;
  content = contentList.join("\n");
  return content
};

function addQuote(content, entry) {
  content = addQuoteCallout(content, entry.text, entry.note);
  return content;
}

// - Parse JSON, making a list of all headings
// - Read the `last-completed-chapter` YAML property
// - If it does not exist, exit the script
// - For every chapter in JSON after that one:
// 	- if the chapter’s heading does not exist in my notes:
// 		- add the heading and associated highlights
// 	- otherwise:
// 		- overwrite chapter with associated yellow highlights

function addImportantHighlights(content, json) {
  // first, build up a list of chapter notes
  let chaptersToEdit = getListOfChaptersToEdit(content, json);
  let chapterList = getListOfChaptersInJSON(json);
  let chapterDict = {};
  chaptersToEdit.forEach(item => {
    chapterDict[item] = "";
  });
  for (const entry of json) {
    if (chaptersToEdit.includes(entry.chapter) && entry.color == importantHighlightColor) {
      chapterDict[entry.chapter] += "\nPage " + entry.pageno + ": \n" + entry.text + "\n";
      if (entry.note) {
        chapterDict[entry.chapter] += "My notes: " + entry.note + "\n";
      }
    }
  }
  for (const chapter of chaptersToEdit) {
    if (!isHeadingPresent(content, chapter)) {
      content = addNewChapter(content, chapter, chapterDict[chapter]);
    }
    else {
      content = overWriteChapter(content, chapter, chapterDict[chapter]);
    }
  }
  return content;
}


function getMostRecentChapter(content) {
  const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!yamlMatch) return null;

  const yaml = yamlMatch[1];
  const chapterMatch = yaml.match(/^last-completed-chapter:\s*(?:"([^"]+)"|(.+))$/m);

  if (!chapterMatch) return null;

  return chapterMatch[1] || chapterMatch[2];
}

function getListOfChaptersInJSON(json) {
  chapterList = [];
  for (const entry of json) {
    if (!chapterList.includes(entry.chapter)) {
      chapterList.push(entry.chapter);
    }
  }
  return chapterList;
}

function getListOfChaptersToEdit(content, json) {
  chapterList = getListOfChaptersInJSON(json);
  lastChapter = getMostRecentChapter(content);
  if (lastChapter === YAMLStartedBook) {
    return chapterList;
  }
  else if (lastChapter === YAMLCompletedBook) {
    return [];
  }
  else if (chapterList.includes(lastChapter)) {
    return chapterList.slice(chapterList.indexOf(lastChapter) + 1);
  }
  console.warn(`Warning: last-completed-chapter "${lastChapter}" not found in JSON. Adding all chapters.`);
  return chapterList;
}

function isHeadingPresent(content, heading) {
  let regex = new RegExp(`(#)+ ${heading}`, 'm');
  return regex.test(content);
}

function addNewChapter(content, chapterHeading, chapterContent) {
  content += "\n### " + chapterHeading + "\n\n" + chapterContent + "\n";
  return content;
}

function overWriteChapter(content, chapterTitle, newChapterContent) {
  let lines = content.split("\n");
  const chapterHeading = "### " + chapterTitle;
  const startIndex = lines.indexOf(chapterHeading);

  if (startIndex === -1) return content;

  let endIndex = startIndex + 1;
  while (endIndex < lines.length && !lines[endIndex].startsWith("#")) {
    endIndex++;
  }

  const newLines = newChapterContent.split("\n");
  newLines.unshift("");
  newLines.push("");
  lines.splice(startIndex + 1, endIndex - startIndex - 1, ...newLines);
  return lines.join("\n");
}


function addMemorableMoment(content, entry) {
  if (entry.note === "") {
    return content;
  }
  let regex = new RegExp(entry.note)
  if (regex.test(content)) {
    return content;
  }
  let lines = content.split("\n");
  let index = getToBottomOfSection(content, memorableMomentsHeading);
  lines.splice(index - 1, 0, "- " + entry.note);
  return lines.join("\n");
}

function addUnderlined(content, entry) {
  return content;
}


function addHeadingBeforeAnother(content, headingName, headingContent, nextHeading) {
  let lines = content.split("\n");
  let index = lines.indexOf(nextHeading);

  const newLines = [
    "### " + headingName,
    "",
    headingContent,
    ""
  ];

  lines.splice(index, 0, ...newLines);
  return lines.join("\n");
}

function addOrOverwrite(content, entry, nextHeading) {
  if (!entry.note) {
    entry.note = "";
  }
  lines = content.split("\n");
  // if the heading does not exist, add text as heading and notes as text content
  if (!isHeadingPresent(content, entry.text)) {
    return addHeadingBeforeAnother(content, entry.text, entry.note, nextHeading);
  }
  // if the heading does exist, and its contents are within the 
  // current note, overwrite it
  let startIndex = lines.indexOf("### " + entry.text);
  let endIndex = getToBottomOfSection(content, "### " + entry.text);
  let headingSection = lines.slice(startIndex, endIndex + 1);
  // if any non empty line in headingSection with over 3 characters shows up in entry.note, overwrite
  const shouldOverwrite = headingSection.some(line => {
    const trimmed = line.trim();
    return trimmed.length > 3 && entry.note.includes(trimmed);
  });
  if (shouldOverwrite) {
    return overWriteChapter(content, entry.text, entry.note);
  }
  return content;
}

function addCharacter(content, entry) {
  return addOrOverwrite(content, entry, chapterSectionHeading);
}

function addLore(content, entry) {
  return addOrOverwrite(content, entry, charactersSectionHeading);
}

function processHighlights(content, json) {
  // - Underlined →  Standard underlining, not to be tracked/recorded
  // - Yellow highlight →  Funny moment →  Copy and pasted in a closed callout
  // - Red highlight →  Important →  To be pasted into the chapter, and be reviewed later in my own words
  // - Blue highlight →  Quote →  To be added in the quotes section in a quote callout
  // - Orange highlight →  Unforgetable moment →  To be added in unforgettable moments section, and edited with my own words later
  // - Cyan highlight →  Character →  To be added in characters section, with name as heading, and notes in my own words
  // - Olive highlight →  Lore →  To be added in lore section, with name as heading, to be summarized in my own words later

  const highlightHandlers = {
    [funnyHighlightColor]: addToFunnyMoments,
    [importantHighlightColor]: addUnderlined,
    [quoteHighlightColor]: addQuote,
    [memorableMomentHighlightColor]: addMemorableMoment,
    [characterHighlightColor]: addCharacter,
    [loreHighlightColor]: addLore
  }
  for (const entry of json) {
    if (entry.drawer === "lighten" && entry.color in highlightHandlers) {
      let currentHighlightHandler = highlightHandlers[entry.color];
      content = currentHighlightHandler(content, entry);
    }
  }

  content = addImportantHighlights(content, json);
  return content;
}


module.exports = async (params) => {
  const { quickAddApi: { inputPrompt }, app } = params;



  // Get most recent highlights file

  try {
    const folder = app.vault.getAbstractFileByPath(KOReaderPath)
    const files = folder.children;
    const mostRecentFile = files.reduce((latest, current) =>
      (current.stat.mtime > latest.stat.mtime) ? current : latest
    );
    const fileContents = await app.vault.cachedRead(mostRecentFile);
    // new Notice("File found: " + mostRecentFile.name + "\nContents: " + fileContents);

    const userProceeds = await inputPrompt("Most recent file: " + mostRecentFile.name + "\n Proceed? (y/n): ");

    if (userProceeds.toLowerCase() !== 'y') {
      new Notice("Operation cancelled.");
      return;
    }

    let json = fileContents;
    const activeFile = app.workspace.getActiveFile();

    if (!activeFile) {
      new Notice("No active file found.");
      return;
    }

    // Read current content
    let content = await app.vault.read(activeFile);
    json = JSON.parse(json);

    content = processHighlights(content, json);

    // Write the modified content back to the file
    await app.vault.modify(activeFile, content);

    new Notice("Highlights successfully synced!");

    const deleteFile = await inputPrompt("Delete highligths file? (y/n)");
    if (deleteFile.toLowerCase() === 'y') {
      app.vault.delete(mostRecentFile);
    }

  } catch (error) {
    new Notice("Error modifying file: " + error.message);
  }

}

