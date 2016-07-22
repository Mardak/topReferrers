const MIN_REFERRER_COUNT = 5;

const { Cu } = require("chrome");
const tabs = require("sdk/tabs");

const { PlacesUtils } = Cu.import("resource://gre/modules/PlacesUtils.jsm", {});

PlacesUtils.promiseDBConnection().then(db => db.execute(`
  SELECT
    CAST((STRFTIME('%s', 'now') - tv.visit_date / 1000 / 1000) / 60 / 60 / 24 / 30.4 AS INT) ago,
    COUNT(DISTINCT th.url) c,
    fh.url,
    fh.title
  FROM moz_historyvisits tv
  JOIN moz_places th
    ON th.id = tv.place_id
  LEFT JOIN moz_historyvisits fv
    ON fv.id = tv.from_visit
  JOIN moz_places fh
    ON fh.id = fv.place_id
  GROUP BY fh.url, ago
  HAVING c >= ${MIN_REFERRER_COUNT}
  ORDER BY ago, c DESC
`)).then(rows => {
  let data = [];
  rows.forEach(row => {
    data.push([row.getResultByName("ago"), row.getResultByName("c"), row.getResultByName("url"), row.getResultByName("title")]);
  });
  tabs.open({
    url: "./top-referrers.html",
    onLoad: tab => tab.attach({
      contentScriptFile: "./top-referrers.js",
      contentScriptOptions: { data }
    })
  });
});
