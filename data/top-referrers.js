const MAX_HOST_LENGTH = 26;
const MAX_PAGES = 50;

// Process the pages data from the result of the SQL query.
let mostPages = 0;
let monthsAgo = new Map();
self.options.data.forEach(([ago, count, url, title]) => {
  // Initialize for this "ago" if necessary.
  let agoData = monthsAgo.get(ago);
  if (!agoData) {
    agoData = {
      ranks: [],
      urls: new Map()
    };
    monthsAgo.set(ago, agoData);
  }

  // Only track the highest ranked pages.
  if (agoData.ranks.length === MAX_PAGES) {
    return;
  }

  // Store data for ranked traversal and url lookup.
  agoData.ranks.push(url);
  agoData.urls.set(url, {
    ago,
    count,
    rank: agoData.ranks.length,
    title,
    url
  });

  // Remember the most pages for any given month ago.
  if (mostPages < agoData.ranks.length) {
    mostPages = agoData.ranks.length;
  }
});

// Create 2-d array of page rows and months ago columns.
let tableData = [];
for (let i = 0; i < mostPages; i++) {
  tableData.push(new Array(monthsAgo.size).fill({}));
}

// Add in actual page rank data for the table.
let prevAgo;
let headers = [];
[...monthsAgo.keys()].sort((a, b) => b - a).forEach((ago, col) => {
  headers.push(ago);

  let { ranks, urls } = monthsAgo.get(ago);
  ranks.forEach((url, row) => {
    let { count, rank, title } = urls.get(url);
    tableData[row][col] = {
      ago,
      count,
      // Calculate the rank change from the previous month.
      delta: (prevAgo && monthsAgo.get(prevAgo).urls.get(url) || {}).rank - rank,
      rank,
      title,
      url
    };
  });

  // Update the previous month ago to the one just processed.
  prevAgo = ago;
});

// Display the headers for the table.
let headerTr = document.getElementById("header");
headers.forEach(ago => {
  let th = document.createElement("th");
  headerTr.appendChild(th);
  th.textContent = `${ago} month${ago !== 1 ? "s" : ""} ago`;
});

// Build the table view with content.
let table = document.getElementById("results");
tableData.forEach(row => {
  let tr = document.createElement("tr");
  table.appendChild(tr);
  row.forEach(col => {
    let td = document.createElement("td");
    tr.appendChild(td);

    if (!col) {
      return;
    }

    // Store data on the table entry.
    for (let [key, val] of Object.entries(col)) {
      td.dataset[key] = val;
    }

    // Show stuff for the table entry.
    let host = new URL(col.url).hostname.replace(/^www\./, "");
    td.textContent = `
      ${Number.isNaN(col.delta) ? "🆕" : col.delta < 0 ? "↘️" : col.delta > 0 ? "↗️" : "➡️"}
      ${host.length > MAX_HOST_LENGTH ? "…" + host.slice(-MAX_HOST_LENGTH) : host}
    `;
    td.title = [
      `Rank #${col.rank}`,
      `Delta rank: ${col.delta}`,
      `Referred ${col.count} pages`,
      col.url,
      col.title,
    ].join("\n");
  });
});
