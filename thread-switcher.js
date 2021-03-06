( () => {

/* helper methods for checking if current page is a DM or a Room */
const isDM = () => document.location.pathname.indexOf('/dm/') > -1;
const isRoom = () => document.location.pathname.indexOf('/room/') > -1;

/* variables */
let lastLocationHref;
let currentRoom;
let threadHeadersArray;
let showThreadHeadingTimerID;

/* transform text from a thread summary */
const formatTitleFromThreadHeading = title => {
  return title
  //.replace(/Thread by [^\.]*\./, '') /* remove thread creator */
    .replace(/\. \d+ (Replies|Reply)\./, '') /* remove number of replies */
    .replace(/\. \d+ 件の返信/, '')
    .replace(/\. [^\.]*\d+\:\d+( (A|P)M)?/, '') /* remove string with thread start date */
    .replace(/. Last updated.*$/, '') /* remove everything after "Last updated */
    .replace(/\. 最終更新.*$/, '')
    .replace(/\. Now$/, '') /* remove 'Now' that's added for brand new threads */
    .replace(/\. たった今$/, '')
    .replace(/\. \d+ mins?$/, '') /* remove minute counter for brand new threads */
    .replace(/\. \d+ 分前/, '') /* remove minute counter for brand new threads */
  //.replace(/\d+ Unread\./, ''); /* remove unread counter */
    .replace(/\n.*/gm, '') /* remove the second line and beyond */
    .replace(/。.*/gm, '') /* remove 2nd sentence and beyond */
    .replace(/\*([^(\*)]+)\*/g, '$1'); /* remove bold markdown */
    //.replace(/【([^(【】)]+)】/g, '$1'); /* remove 【】 */
};

/* hide thread heading */
const hideThreadHeading = () => {
  const elem = document.getElementById('thread-heading');
  if (elem) {
    elem.style.display = 'none';
  }
};

/* show thread heading */
const showThreadHeading = thread => {
  const elem = document.getElementById('thread-heading');
  if (elem) {
    const titleArr = thread.textContent.split('.');
    if (titleArr[0].indexOf('Unread') > -1 || titleArr[0].indexOf('未読') > -1) {
      titleArr.shift();
    }
    titleArr.shift();
    elem.textContent = formatTitleFromThreadHeading(titleArr.join('.'));
    elem.style.display = 'block';
    if (typeof showThreadHeadingTimerID === 'number') {
      clearTimeout(showThreadHeadingTimerID);
    }
    showThreadHeadingTimerID = setTimeout(hideThreadHeading, 1000);
  }
};

/* go to the thread selected with the thread selector */
const switchThread = () => {
  const select = document.getElementById('thread-selector');
  if (select) {
    const index = select.selectedIndex - 1;
    if (index >= 0) {
      const threadContainer = threadHeadersArray[index].nextElementSibling;
      if (threadContainer) {
        let timerID;
        const watchScroll = () => {
          if (typeof timerID === 'number') {
            clearTimeout(timerID);
          }
          timerID = setTimeout( () => {
            window.removeEventListener('scroll', watchScroll, true);
            currentRoom.firstChild.scrollTop += 40;
          }, 100);
        };
        window.addEventListener('scroll', watchScroll, true);
        threadContainer.scrollIntoView({behavior: 'smooth', block: 'end', inline: 'nearest'});
        showThreadHeading(threadHeadersArray[index]);
      }
      else {
        console.log('thread container element not found.');
      }
      select.selectedIndex = 0;
    }
  }
  else {
    console.log('#thread-selector not found.');
  }
}

/* build the switcher */
const buildSwitcher = () => {
  /* query for threads in this room */
  const roomId = document.location.pathname.replace(/.*\/room\/([^\/]+).*$/, '$1');
  console.log('location:'+document.location.href+' => roomId:'+roomId);
  currentRoom = document.querySelector(`[data-group-id="space/${roomId}"][role="main"]`);
  if (currentRoom === undefined || currentRoom === null) {
    console.log('Room element not found.');
    return null;
  }
  const threadHeaders = currentRoom.querySelectorAll('[role="heading"][aria-label]');
  threadHeadersArray = Array.from(threadHeaders);
  if (threadHeadersArray.length == 0) {
    console.log('No threads.');
    return null;
  }

  /* build thread list (as <option>s for <select>) */
  const threadList = threadHeadersArray
    .map((thread) => {
      const item = document.createElement('option');
      item.className = 'thread-list-item';
      const titleArr = thread.textContent.split('.');
      if (titleArr[0].indexOf('Unread') > -1 || titleArr[0].indexOf('未読') > -1) {
        item.className = item.className + ' thread-unread';
        titleArr.shift();
      }
      titleArr.shift();
      item.textContent = formatTitleFromThreadHeading(titleArr.join('.'));
      return item;
    });

  /* build <select> DOM */
  const selectDOM = document.createElement('select');
  //selectDOM.id = `thread-group-${group.label}`;
  selectDOM.id = 'thread-selector';
  selectDOM.onchange = switchThread;

  const head = document.createElement('option');
  head.hidden = true;
  head.disabled = true;
  head.className = 'thread-list-header';
  head.textContent = 'スレッド移動';
  selectDOM.appendChild(head);
  threadList.forEach(option => selectDOM.appendChild(option));

  selectDOM.selectedIndex = 0;

  /* build <div> DOM to show heading */
  const headingDOM = document.createElement('div');
  headingDOM.id = 'thread-heading';
  headingDOM.style.display = 'block';

  /* build the switcher DOM */
  const switcherDOM = document.createElement('div');
  switcherDOM.id = 'thread-switcher';
  switcherDOM.appendChild(selectDOM);
  switcherDOM.appendChild(headingDOM);
  return switcherDOM;
};

/* logic for building the switcher and injecting it into the page */
const insertSwitcher = () => {
  /* if we are not in a room, don't build a switcher */
  const switcher = isRoom()
        ? buildSwitcher()
        : ((console.log('Not in a room. location:'+document.location.href)), null);
  if (switcher) {
    const target = currentRoom.nextElementSibling;
    if (target && target.id == 'thread-switcher') {
      /* update switcher that already exists */
      switcher.replaceChild(target.childNodes[1], switcher.childNodes[1]);
      currentRoom.parentNode.replaceChild(switcher, target);
    }
    else {
      /* switcher doesn't exist yet! add it */
      currentRoom.parentNode.insertBefore(switcher, target);
    }
  }
  else {
    /* remove switcher if exists */
    const switcher = document.getElementById('thread-switcher');
    if (switcher) {
      switcher.parentNode.removeChild(switcher);
    }
  }
};

/* css overrides for existing and new controls */
const injectCSS = () => {
  const cssOverride = document.createElement('style');
  cssOverride.innerHTML = `
    #thread-switcher {
    }
    #thread-selector {
      position: absolute;
      top: 0px;
      right: 0px;
      width: 120px;
    }
    #thread-heading {
      position: absolute;
      top: 0px;
      left: 0px;
      background: pink;
    }
    .thread-list-header {}
    .thread-list-item {}
    .thread-unread { font-weight: bold; }
  `;
  document.body.appendChild(cssOverride);
};

/* process to be executed when changes occur in the document */
const run = () => {
  insertSwitcher();
  lastLocationHref = document.location.href;
};

const clickEventHandler = e => {
  if (window.getSelection().toString()) {
    return;
  }
  let node = e.target;
  switch (node.tagName) {
  case 'svg':
  case 'path':
  case 'INPUT':
    return;
  }
  while (node) {
    if (node.previousElementSibling) {
      const role = node.previousElementSibling.getAttribute('role');
      const label = node.previousElementSibling.getAttribute('aria-label');
      if (role == 'heading' && typeof label === 'string') {
        showThreadHeading(node.previousElementSibling);
        return;
      }
      if (role == 'button' && node.previousElementSibling.getAttribute('title') !== null) {
        return;
      }
    }
    node = node.parentNode;
  }
};

const setup = () => {
  /* initial run */
  injectCSS();
  run();

  /* call run when the document changes and then settles down */
  let runID;
  const observer = new MutationObserver( (records) => {
    let count = 0;
    for (const record of records) {
      switch (record.target.id) {
      case 'thread-switcher':
      case 'thread-selector':
      case 'thread-heading':
        /* ignore this */
        break;
      default:
        if (record.type === 'childList') {
          for (const node of Array.from(record.addedNodes)) {
            switch (node.id) {
            case 'thread-switcher':
            case 'thread-selector':
            case 'thread-heading':
              /* ignore this */
              break;
            default:
              if (node.tagName == 'DIV' && node.childElementCount == 1 && node.firstElementChild.tagName == 'INPUT') {
                /* ignore this */
              }
              else if (typeof node.getAttribute === 'function' && node.getAttribute('role') == 'menuitem') {
                /* ignore this */
              }
              else {
                ++count;
              }
              break;
            }
          }
        }
        else {
          ++count;
        }
        break;
      }
    }
    if (count == 0) {
      return;
    }
    /*
    if (document.location.href == lastLocationHref) {
      return;
    }
    */
    if (typeof runID === 'number') {
      clearTimeout(runID);
    }
    runID = setTimeout(run, 200);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('click', clickEventHandler);
};

/* wait for the end of the document loading process before running setup */
window.onload = () => setup();

})();
