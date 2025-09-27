const stage = process.env.SST_STAGE || "dev"

export default {
  url: stage === "production" ? "https://ocsight.com" : `https://${stage}.ocsight.com`,
  email: "contact@ocsight.com",
  socialCard: "https://ocsight.com/og-image.png",
  github: "https://github.com/heyhuynhgiabuu/ocsight",
  npm: "https://www.npmjs.com/package/ocsight",
  social: [
    { icon: "github", label: "GitHub", href: "https://github.com/heyhuynhgiabuu/ocsight" },
    { icon: "npm", label: "npm", href: "https://www.npmjs.com/package/ocsight" },
  ],
  headerLinks: [
    { name: "Home", url: "/" },
    { name: "Docs", url: "/docs/" },
    { name: "GitHub", url: "https://github.com/heyhuynhgiabuu/ocsight" },
    { name: "npm", url: "https://www.npmjs.com/package/ocsight" },
  ],
}