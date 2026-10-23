const wiki = 'https://dispatch.wiki.gg';
const api = wiki + '/api.php';

var statNames = ['Combat', 'Vigor', 'Mobility', 'Charisma', 'Intellect'];

var infoList = [['Real name', 'Name'], ['Age', 'Age'], ['Height', 'Height'], ['Abilities', 'Abilities'], ['Power', 'Powers'],
  ['Birthplace', 'Birthplace'], ['Bio', 'Bio'], ['Crimes', 'Crimes'], ['Affiliation', 'Affiliation'], ['Voiced by', 'Voice']];

var elSearch = document.getElementById("searchInput");
var elRoster = document.getElementById("roster");
var elMessage = document.getElementById("message");
var elResult = document.getElementById("result");
var elBustWrap = document.getElementById("bustWrap");
var elBust = document.getElementById("bust");
var elMug = document.getElementById("mug");
var elName = document.getElementById("name");
var elAka = document.getElementById("aka");
var elTraits = document.getElementById("traits");
var elInfo = document.getElementById("info");
var elStats = document.getElementById("stats");
var elLink = document.getElementById("wikiLink");

function findValueElement(box, label) {
  var all = box.querySelectorAll('*');
  for (var i = 0; i < all.length; i++) {
    if (all[i].children.length === 0 && all[i].textContent.trim().toLowerCase() === label.toLowerCase()) {
      return all[i].nextElementSibling || all[i].parentElement.nextElementSibling;
    }
  }
  return null;
}

function getValue(box, label) {
  var el = findValueElement(box, label);
  if (!el) return '';
  return el.textContent.trim();
}

function getTraits(box) {
  var el = findValueElement(box, 'Keywords');
  var html = '';
  if (!el) return html;

  var text = '';
  for (var i = 0; i < el.childNodes.length; i++) {
    if (el.childNodes[i].nodeName === 'BR') {
      text += '|';
    } else {
      text += el.childNodes[i].textContent;
    }
  }

  var parts = text.split('|');
  for (var j = 0; j < parts.length; j++) {
    if (parts[j].trim() !== '') {
      html += '<span class="trait">' + parts[j].trim() + '</span>';
    }
  }
  return html;
}

function getStat(doc, name) {
  var links = doc.querySelectorAll('a');
  for (var i = 0; i < links.length; i++) {
    var href = links[i].getAttribute('href');
    var text = links[i].textContent.trim();
    if (href && href.includes('Attributes#' + name) && text !== '' && !isNaN(text)) {
      return Number(text);
    }
  }
  return 0;
}

function showCharacter(title, doc) {
  var box = doc.querySelector('.druid-container, .infobox, .portable-infobox') || doc;

  var vals = [];
  var total = 0;
  for (var i = 0; i < statNames.length; i++) {
    vals[i] = getStat(doc, statNames[i]);
    total = total + vals[i];
  }
  if (total === 0) return false;

  var aka = getValue(box, 'Aliases').split(',')[0].trim();
  elName.innerHTML = title;
  elAka.innerHTML = aka ? 'AKA ' + aka : '';
  elTraits.innerHTML = getTraits(box);

  var bustEl = box.querySelector('img[src*="Hero_Busts"]') || box.querySelector('img');
  if (bustEl) {
    var src = bustEl.getAttribute('src');
    if (src.charAt(0) === '/') src = wiki + src;
    elBust.src = src;
    elBust.alt = title;
    elBustWrap.style.display = 'flex';
  } else {
    elBustWrap.style.display = 'none';
  }

  var mugEl = box.querySelector('img[src*="Mugshot"]') || doc.querySelector('img[src*="Mugshot"]');
  if (mugEl) {
    var mugSrc = mugEl.getAttribute('src');
    if (mugSrc.charAt(0) === '/') mugSrc = wiki + mugSrc;
    elMug.src = mugSrc;
    elMug.alt = 'Mugshot of ' + title;
    elMug.style.display = 'block';
  } else {
    elMug.style.display = 'none';
  }

  var info = '';
  for (var j = 0; j < infoList.length; j++) {
    var value = getValue(box, infoList[j][1]);
    if (value !== '') {
      info += '<div class="label">' + infoList[j][0] + '</div><div class="value">' + value + '</div>';
    }
  }
  elInfo.innerHTML = info;

  var stats = '';
  for (var k = 0; k < statNames.length; k++) {
    stats += '<div class="statrow"><span>' + statNames[k] + '</span><span>' + vals[k] + '</span></div>';
    stats += '<div class="progress mb-2"><div class="progress-bar" style="width: ' + (vals[k] * 10) + '%"></div></div>';
  }
  stats += '<div class="statrow fw-bold"><span>Total</span><span>' + total + '</span></div>';
  elStats.innerHTML = stats;

  var pageUrl = wiki + '/wiki/' + title.split(' ').join('_');
  elLink.onclick = function () { window.open(pageUrl); };
  return true;
}

function showMessage(text) {
  elResult.style.display = 'none';
  elMessage.innerHTML = '<div class="err">' + text + '</div>';
}

const loadRoster = async () => {
  const response = await fetch(api + '?action=query&list=categorymembers&cmtitle=Category:Dispatchable_Heroes&cmlimit=50&format=json&origin=*');
  const data = await response.json();

  var chips = '';
  for (var i = 0; i < data.query.categorymembers.length; i++) {
    var title = data.query.categorymembers[i].title;
    chips += '<div class="chip" onclick="getCharacter(\'' + title + '\')">' + title + '</div>';
  }
  elRoster.innerHTML = chips;
}

const getCharacter = async (term) => {
  var q = (term || elSearch.value).trim();
  if (!q) return;
  elSearch.value = q;

  elResult.style.display = 'none';
  elMessage.innerHTML = '<div class="text-center p-5"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div></div>';

  const searchResponse = await fetch(api + '?action=opensearch&search=' + q + '&limit=5&format=json&origin=*');
  const found = await searchResponse.json();
  const title = found[1][0];
  if (!title) {
    showMessage('No file found for "' + q + '". Try a hero\'s name, like Invisigal or Golem.');
    return;
  }

  const pageResponse = await fetch(api + '?action=parse&page=' + title + '&prop=text&redirects=1&format=json&origin=*');
  const page = await pageResponse.json();
  const doc = new DOMParser().parseFromString(page.parse.text['*'], 'text/html');

  if (showCharacter(page.parse.title, doc)) {
    elMessage.innerHTML = '';
    elResult.style.display = 'block';
  } else {
    showMessage('"' + page.parse.title + '" exists on the wiki but has no hero stats. Try one of the heroes above.');
  }
}

loadRoster();
