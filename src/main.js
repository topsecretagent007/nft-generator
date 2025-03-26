import fs from "fs";
import { createCanvas, loadImage } from "canvas";
import { format, rarity, supply, startIndex } from "./config.js";

if (!process.env.PWD) {
  process.env.PWD = process.cwd();
}

const imagesDir = `${process.env.PWD}/build/Images`;
const jsonsDir = `${process.env.PWD}/build/Jsons`;
const layersDir = `${process.env.PWD}/layers`;
let genes = [];
let geneStrings = [];

String.prototype.hashCode = function () {
  var hash = 0, i, chr;
  if (this.length === 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr = this.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash;
}

const selectAttribute = (attributeData) => {
  if (!attributeData || !attributeData.Types || !attributeData.Rarity) {
    throw new Error("Invalid attribute data structure. Check config.js.");
  }

  const total = attributeData.Rarity.reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * total;
  let index = 0;

  while (random > 0 && index < attributeData.Rarity.length) {
    random -= attributeData.Rarity[index];
    if (random <= 0) break;
    index++;
  }

  return {
    name: attributeData.Types[index] || "Unknown",
    rarity: attributeData.Rarity[index] || 0,
  };
};

const calculateTotalRarity = (attributes) => {
  let totalRarity = 0;
  attributes.forEach(attr => {
    totalRarity += 1 / attr.rarity;
  });
  return (1 / totalRarity) * 100;
};

const generateGenes = async () => {
  for (let index = startIndex; index < supply; index++) {
    const attributes = {
      bg: selectAttribute(rarity.BG),
      body: selectAttribute(rarity.Body),
      shoes: selectAttribute(rarity.Shoes),
      pant: selectAttribute(rarity.Pant),
      shirt: selectAttribute(rarity.Shirt),
      gear: selectAttribute(rarity.Gear),
      head: selectAttribute(rarity.Head),
      eye: selectAttribute(rarity.Eyes),
      mouth: selectAttribute(rarity.Mouth),
      cap: selectAttribute(rarity.Cap)
    };

    let geneString = Object.values(attributes).map(attr => attr.name).join(":");
    if (geneStrings.includes(geneString)) {
      index--;
    } else {
      geneStrings.push(geneString);
      attributes.totalRarity = calculateTotalRarity(Object.values(attributes));
      genes.push(attributes);
    }
  }
}

const drawLayer = async (index, pathName, _canvas, _ctx) => {
  const image = await loadImage(`${layersDir}/${pathName}.png`);
  _ctx.drawImage(image, 0, 0, format.width, format.height);
  fs.writeFileSync(`${imagesDir}/${index}.png`, _canvas.toBuffer("image/png"));
}

const generateImage = async (index) => {
  const canvas = createCanvas(format.width, format.height);
  const ctx = canvas.getContext("2d");
  const attributes = genes[index];

  for (const key of Object.keys(attributes)) {
    if (key !== "totalRarity") {
      await drawLayer(index, `${key}/${attributes[key].name}`, canvas, ctx);
    }
  }
}

const generateMetaData = async (index) => {
  const attributes = genes[index];
  fs.writeFileSync(
    `${jsonsDir}/${index}.json`,
    JSON.stringify({
      name: "PUFF DOG #" + index,
      symbol: "$PUFF",
      description: "Join the movement and stay chilled with Puff Coin, because in this fast-paced world, everyone deserves a little peace and love.",
      image: `${index}.png`,
      edition: index,
      attributes: Object.keys(attributes).filter(key => key !== "totalRarity").map(key => ({
        trait_type: key,
        value: attributes[key].name,
        // rarity: attributes[key].rarity + "%"
      })),
      total_rarity: attributes.totalRarity.toFixed(2) + "%",
      properties: {
        files: [{ "uri": `${index}.png`, "type": "image/png" }],
        category: "image",
        collection: { "name": "PUFF DOG NFTS" }
      },
      compiler: "HashLips Art Engine"
    }, null, 2)
  );
}

export const cleanProject = () => {
  if (fs.existsSync(imagesDir)) fs.rmSync(imagesDir, { recursive: true });
  if (fs.existsSync(jsonsDir)) fs.rmSync(jsonsDir, { recursive: true });
  fs.mkdirSync(imagesDir);
  fs.mkdirSync(jsonsDir);
}

export const generateNFTData = async () => {
  await generateGenes();
  for (let i = 0; i < supply; i++) {
    try {
      await generateImage(i);
      await generateMetaData(i);
      console.log(`Generated NFT #${i}`);
    } catch (error) {
      console.error(`Error generating NFT #${i}:`, error);
    }
  }
}
