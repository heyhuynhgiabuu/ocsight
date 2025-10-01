export const domain = (() => {
  if ($app.stage === "production") return "ocsight.com";
  if ($app.stage === "dev") return "dev.ocsight.com";
  return `${$app.stage}.dev.ocsight.com`;
})();
