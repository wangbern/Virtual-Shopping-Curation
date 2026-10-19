import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
//#region app/lib/time.ts
var PST = "America/Los_Angeles";
/** YYYY-MM-DD in Pacific time. Used for daily to-do resets and item generation. */
function pstDate(at = Date.now()) {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: PST,
		year: "numeric",
		month: "2-digit",
		day: "2-digit"
	}).format(at);
}
/** FNV-1a 32-bit string hash. */
function hashString(s) {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}
/** Small, fast seeded PRNG (mulberry32). Returns floats in [0, 1). */
function rng(seed) {
	let a = seed >>> 0;
	const next = () => {
		a = a + 1831565813 >>> 0;
		let t = a;
		t = Math.imul(t ^ t >>> 15, t | 1);
		t ^= t + Math.imul(t ^ t >>> 7, t | 61);
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
	return {
		next,
		int: (min, max) => min + Math.floor(next() * (max - min + 1)),
		pick: (arr) => arr[Math.floor(next() * arr.length)],
		chance: (p) => next() < p
	};
}
//#endregion
//#region app/lib/worlds.ts
var WORLD_IDS = [
	"mermaid",
	"fairy",
	"vampire",
	"hogwarts",
	"normal"
];
var WORLDS = {
	mermaid: {
		id: "mermaid",
		name: "Mermaid",
		currency: "pearl",
		hues: [160, 220],
		background: "linear-gradient(180deg, #7fe3e0 0%, #2a8fb8 45%, #123a6b 100%)",
		interactions: [
			{
				kind: "seashell",
				label: "Seashell",
				hint: "open the shell",
				taps: 2,
				zone: "floor"
			},
			{
				kind: "starfish",
				label: "Starfish",
				hint: "lift the starfish",
				taps: 1,
				zone: "floor"
			},
			{
				kind: "bubble",
				label: "Bubble",
				hint: "pop the bubble",
				taps: 1,
				zone: "mid"
			},
			{
				kind: "jellyfish",
				label: "Jellyfish swarm",
				hint: "shoo the jellyfish",
				taps: 4,
				zone: "mid"
			},
			{
				kind: "manta",
				label: "Sleeping manta ray",
				hint: "wake the manta",
				taps: 3,
				zone: "floor"
			}
		]
	},
	fairy: {
		id: "fairy",
		name: "Fairy",
		currency: "acorn",
		hues: [80, 330],
		background: "linear-gradient(180deg, #ffd6ef 0%, #b8e6a8 50%, #4f7d3a 100%)",
		interactions: [
			{
				kind: "flower",
				label: "Flower bud",
				hint: "bloom the flower",
				taps: 3,
				zone: "floor"
			},
			{
				kind: "mushroom-ring",
				label: "Mushroom ring",
				hint: "complete the ring",
				taps: 1,
				zone: "floor"
			},
			{
				kind: "berry",
				label: "Berry",
				hint: "pick the berry",
				taps: 1,
				zone: "mid"
			},
			{
				kind: "leaves",
				label: "Green leaves",
				hint: "paint the leaves",
				taps: 4,
				zone: "sky"
			},
			{
				kind: "spider",
				label: "Spider web",
				hint: "place the spider",
				taps: 2,
				zone: "mid"
			}
		]
	},
	vampire: {
		id: "vampire",
		name: "Vampire",
		currency: "blood drop",
		hues: [330, 380],
		background: "linear-gradient(180deg, #1b1030 0%, #3d1835 50%, #120a14 100%)",
		interactions: [
			{
				kind: "moon",
				label: "Crescent moon",
				hint: "fill the moon",
				taps: 2,
				zone: "sky"
			},
			{
				kind: "book",
				label: "Old book",
				hint: "flip the pages",
				taps: 3,
				zone: "floor"
			},
			{
				kind: "trees",
				label: "Forest trees",
				hint: "search the trees",
				taps: 2,
				zone: "mid"
			},
			{
				kind: "apple",
				label: "Red apple",
				hint: "bite the apple",
				taps: 1,
				zone: "floor"
			},
			{
				kind: "deer",
				label: "Deer",
				hint: "scare the deer",
				taps: 1,
				zone: "floor"
			}
		]
	},
	hogwarts: {
		id: "hogwarts",
		name: "Hogwarts",
		currency: "galleon",
		hues: [120, 170],
		background: "linear-gradient(180deg, #0f2a22 0%, #1d4a3a 50%, #0a1612 100%)",
		interactions: [
			{
				kind: "wand",
				label: "Wand",
				hint: "wave: accio!",
				taps: 2,
				zone: "mid"
			},
			{
				kind: "portrait",
				label: "Portrait door",
				hint: "open the portrait",
				taps: 1,
				zone: "mid"
			},
			{
				kind: "squid",
				label: "Giant squid",
				hint: "tap the squid",
				taps: 2,
				zone: "floor"
			},
			{
				kind: "map",
				label: "Folded map",
				hint: "unfurl the map",
				taps: 2,
				zone: "floor"
			},
			{
				kind: "wand-duel",
				label: "Green light beam",
				hint: "connect the beams",
				taps: 5,
				zone: "sky"
			}
		]
	},
	normal: {
		id: "normal",
		name: "Normal",
		currency: "credit card",
		hues: [0, 360],
		background: "linear-gradient(180deg, #fff3d6 0%, #ffd0e2 50%, #c9b8ff 100%)",
		interactions: [
			{
				kind: "bed",
				label: "Messy bed",
				hint: "make the bed",
				taps: 3,
				zone: "floor"
			},
			{
				kind: "rack",
				label: "Clothing rack",
				hint: "flip the rack",
				taps: 2,
				zone: "mid"
			},
			{
				kind: "present",
				label: "Box present",
				hint: "unwrap the present",
				taps: 2,
				zone: "floor"
			},
			{
				kind: "window",
				label: "Shop window",
				hint: "peek inside",
				taps: 1,
				zone: "mid"
			},
			{
				kind: "ad",
				label: "Shopping ad window",
				hint: "click the ad",
				taps: 1,
				zone: "sky"
			}
		]
	}
};
//#endregion
//#region app/lib/styles.ts
/**
* Substyle profiles (PRD "World Style" table).
*
* A profile BIASES generation — it never locks construction. A Gothic dress can still be a mini,
* a slip dress or a ball gown (PRD "Separate style from construction"). Anything listed in `likes`
* gets extra weight wherever it matches an option name, in any category.
*/
/** Drawable motifs — each has labeled art in components/garments/motifs.tsx. */
var MOTIFS = [
	"star",
	"sparkle",
	"moon",
	"heart",
	"flower",
	"rose",
	"leaf",
	"shell",
	"pearl",
	"wave",
	"bubble",
	"bow",
	"bat",
	"snake",
	"butterfly",
	"mushroom",
	"crown",
	"cross",
	"drop",
	"gem",
	"key",
	"cherry",
	"potion",
	"web",
	"feather",
	"lightning",
	"apple",
	"snowflake"
];
var METALS = {
	gold: "#e8b84a",
	"rose gold": "#e9a38f",
	silver: "#c9ced8",
	chrome: "#e6ecf5",
	gunmetal: "#5d6170",
	"antique brass": "#a8834a"
};
var ERAS = [
	"Ancient",
	"Victorian",
	"1920s",
	"1960s",
	"1980s",
	"Y2K",
	"Futuristic"
];
var WORLD_STYLES = [
	"Gothic",
	"Romantic",
	"Celestial",
	"Fantasy",
	"Cyberpunk",
	"Royal",
	"Alien",
	"Underwater"
];
var split = (s) => s.split(",").map((x) => x.trim()).filter(Boolean);
function build(rows) {
	return rows.map(([name, colors, metals, motifs, patterns, eras, ws, likes]) => ({
		name,
		colors: split(colors),
		metals: split(metals),
		motifs: split(motifs),
		patterns: split(patterns),
		eras: split(eras),
		worldStyle: split(ws),
		likes: split(likes.toLowerCase())
	}));
}
var MERMAID = build([
	[
		"Ocean Mermaid",
		"#3fd6c8,#1aa6c4,#a8f5e8,#2b6fb0,#f2fffb",
		"silver,chrome",
		"wave,shell,bubble,pearl",
		"scales,ombre,gradient,iridescent",
		"Ancient,Y2K",
		"Underwater,Fantasy",
		"chiffon,organza,silk,tulle,draped,flowing,iridescent film,sequins,pearls,shell,sheer,bustier,cascading"
	],
	[
		"Pearl Mermaid",
		"#f6efe3,#e9d8c4,#f4dfe6,#d7e4ea,#fff9f2",
		"silver,rose gold,gold",
		"pearl,shell,bow",
		"lace,iridescent,solid",
		"Victorian,1920s",
		"Romantic,Underwater",
		"pearls,satin,silk,beading,delicate,slip dress,choker,minaudière,crystals"
	],
	[
		"Siren",
		"#0c3b5e,#7a1035,#1b6f8a,#c21d55,#09202f",
		"gold,gunmetal",
		"wave,shell,drop",
		"scales,ombre,solid",
		"1920s,1980s",
		"Underwater,Gothic",
		"column,bodycon,plunging,satin,draped,ruched,slit,cutout,sequins,stilettos,pearls"
	],
	[
		"Dark Mermaid",
		"#0b1a1f,#0e4c4f,#1e2b3a,#3a7a73,#07100f",
		"gunmetal,silver",
		"shell,snake,drop,wave",
		"scales,snake,ombre",
		"Futuristic,Victorian",
		"Gothic,Underwater",
		"latex,leather,spiked,asymmetrical,pointed,chains,vinyl,sculptural,cutout,shell"
	],
	[
		"Coral Reef",
		"#ff7a6b,#ff9f5a,#ffcfb3,#f2508f,#3cc6c2",
		"gold,rose gold",
		"shell,flower,star,bubble",
		"abstract,tropical,ombre,multicolor",
		"1960s,Y2K",
		"Underwater,Fantasy",
		"organic,ruffles,tiered,layered,crochet,fringe,coral,sculptural,shell"
	],
	[
		"Shell Goddess",
		"#f8e7d6,#efc6b5,#d9b98f,#fff3e8,#c9a3a8",
		"gold,rose gold",
		"shell,pearl,wave",
		"iridescent,solid,lace",
		"Ancient,1920s",
		"Royal,Underwater",
		"sculptural,corset,bustier,pearlescent,shell,structured,minaudière,crown,gown"
	],
	[
		"Jellyfish",
		"#d9c9ff,#ffd1f0,#b9f3ff,#8fe3ff,#f7ecff",
		"silver,chrome",
		"bubble,drop,sparkle",
		"iridescent,holographic,gradient",
		"Futuristic,Y2K",
		"Underwater,Alien",
		"translucent,transparent,tulle,organza,mesh,trailing,ribbons,layered,cascading,sheer,bell sleeves"
	],
	[
		"Deep Sea",
		"#0a1438,#14286b,#1ee8c4,#6a3cff,#04081a",
		"gunmetal,chrome",
		"bubble,star,sparkle,drop",
		"ombre,digital,stars",
		"Futuristic",
		"Underwater,Alien",
		"leds,light-reactive,velvet,mesh,metallic,sculptural,cape,floating"
	],
	[
		"Ice Mermaid",
		"#cfefff,#9ad8f2,#eef9ff,#b8c6e6,#ffffff",
		"silver,chrome",
		"snowflake,gem,sparkle,pearl",
		"iridescent,holographic,ombre",
		"Futuristic",
		"Underwater,Fantasy",
		"crystals,rhinestones,glass,silver,acrylic,crystal wings,structured,sequins"
	],
	[
		"Tropical Mermaid",
		"#ff4f8b,#ffcc33,#22c7a9,#ff7a3d,#7a5cff",
		"gold",
		"flower,shell,leaf,star",
		"tropical,floral,multicolor",
		"1960s,Y2K",
		"Underwater,Fantasy",
		"bikini,crop top,sarong,wrap,wrapped,sandals,fringe,beads,shell,mini skirt,bralette"
	]
]);
var FAIRY = build([
	[
		"Flower Fairy",
		"#ffb3d1,#c9a7ff,#b9e59a,#ffe08a,#ff8fb8",
		"gold,rose gold",
		"flower,leaf,butterfly,rose",
		"floral,roses,ombre",
		"Victorian,1960s",
		"Fantasy,Romantic",
		"petals,floral,chiffon,tulle,ruffles,puff sleeves,appliqué,flowers,butterfly wings"
	],
	[
		"Pixie",
		"#9fe870,#ff9ad5,#ffd84d,#6fd3ff,#c39bff",
		"gold,silver",
		"star,sparkle,leaf,mushroom",
		"polka,stars,multicolor",
		"Y2K,1960s",
		"Fantasy",
		"micro,mini,crop top,pointed,asymmetrical,tiny,charms,micro crop,ankle boots,insect wings"
	],
	[
		"Dark Fairy",
		"#1d1027,#4a1f5c,#123224,#7d1d3f,#0b0b10",
		"gunmetal,silver",
		"rose,moon,bat,web,feather",
		"lace,roses,ombre",
		"Victorian",
		"Gothic,Fantasy",
		"lace,black,thorn,corset,velvet,spiked,dragon wings,feathers,asymmetrical,choker"
	],
	[
		"Forest Fairy",
		"#5d7f3a,#a3b86c,#7a5a3a,#d8c58a,#2f4a2a",
		"antique brass,gold",
		"leaf,mushroom,feather,flower",
		"abstract,tropical,embroidered",
		"Ancient",
		"Fantasy",
		"organic materials,leather,suede,knit,layered,moss,draped,fringe,wood,leaf,wrapped"
	],
	[
		"Fairy Princess",
		"#ffc7e5,#e7d2ff,#fff1a8,#c7f2ff,#ffffff",
		"gold,rose gold",
		"crown,sparkle,bow,star,heart",
		"holographic,stars,ombre",
		"Victorian,Y2K",
		"Royal,Fantasy",
		"ball gown,tulle,glitter,bows,crystals,pastel,sweetheart,puff sleeves,tiara,angel wings"
	],
	[
		"Butterfly Fairy",
		"#ff9b3d,#ff4fa3,#7b5cff,#2ec4ff,#ffe14f",
		"gold,silver",
		"butterfly,flower,sparkle",
		"ombre,multicolor,iridescent,gradient",
		"Y2K,1960s",
		"Fantasy",
		"butterfly wings,iridescent,gradient,organza,cutout,halter,cap sleeves,sculptural"
	],
	[
		"Ice Fairy",
		"#e6f7ff,#a9dcff,#ffffff,#c5d3ff,#89c2e0",
		"silver,chrome",
		"snowflake,gem,sparkle,star",
		"iridescent,holographic,lace",
		"Futuristic",
		"Fantasy,Celestial",
		"crystals,frost,glass,sheer,tulle,silver,crystal wings,rhinestones,high neck"
	],
	[
		"Celestial Fairy",
		"#121b4d,#c9d3ff,#f6e7a6,#6b5cff,#0a0f2c",
		"silver,gold",
		"star,moon,sparkle",
		"stars,ombre,holographic",
		"Ancient,Futuristic",
		"Celestial,Fantasy",
		"stars,moons,silver,midnight,sequins,chiffon,cape,celestial,metallic filigree"
	],
	[
		"Mushroom Fairy",
		"#d6363e,#f7ead2,#8a5a3c,#e3b46a,#6b7f3a",
		"antique brass,gold",
		"mushroom,leaf,cherry",
		"polka,gingham,embroidered",
		"Victorian,1960s",
		"Fantasy",
		"woodland,polka,cap sleeves,puff sleeves,knit,linen,bucket bag,ballet flats,pinafore,bloomers"
	],
	[
		"Sugarplum Fairy",
		"#ffb6d5,#f7d7ff,#ffe9f3,#d6a6ff,#ffffff",
		"silver,rose gold",
		"sparkle,bow,star,heart",
		"holographic,ombre,stars",
		"Victorian",
		"Fantasy,Romantic",
		"tulle,ribbons,bows,ballet flats,corset,sparkle,ruffles,tiered,ballet"
	],
	[
		"Angel Fairy",
		"#ffffff,#f7f1e3,#f4e3a6,#e9e4ff,#fff9ec",
		"gold",
		"feather,star,sparkle,heart",
		"lace,iridescent,ombre",
		"Ancient,Victorian",
		"Celestial,Royal",
		"feathers,angel wings,chiffon,draped,ethereal,layered,gold,pearls,gown,cape"
	],
	[
		"Poison Fairy",
		"#9bff2e,#6b2bbf,#2b0f3d,#c3ff6b,#3cff9e",
		"gunmetal,chrome",
		"potion,snake,web,drop,leaf",
		"abstract,digital,snake",
		"Futuristic",
		"Gothic,Alien",
		"acid,thorn,spiked,latex,mesh,asymmetrical,chains,insect wings,cutout,vinyl"
	]
]);
var VAMPIRE = build([
	[
		"Victorian Vampire",
		"#2a0b16,#5b0f24,#1a1a1f,#d9c7c7,#7a1f3b",
		"silver,antique brass",
		"rose,cross,bat,key",
		"lace,baroque,roses",
		"Victorian",
		"Gothic,Royal",
		"corset,high neck,lace,velvet,stand collar,puff sleeves,cameo,choker,lace-up,ruffles"
	],
	[
		"Romantic Vampire",
		"#6e0f2a,#a3243f,#f1d4d4,#3a0d1a,#c46b7f",
		"gold,rose gold",
		"rose,heart,drop",
		"roses,lace,ombre",
		"Victorian,1920s",
		"Romantic,Gothic",
		"roses,chiffon,draped,flowing,lace,off-shoulder,bell sleeves,cowl"
	],
	[
		"Gothic Vampire",
		"#0b0b0e,#2a2a33,#5c0a1b,#c7c7d1,#141414",
		"silver,gunmetal",
		"cross,bat,moon,web",
		"lace,baroque,solid",
		"Victorian,1980s",
		"Gothic",
		"black lace,velvet,silver,platform heels,corset,dramatic,cape,high neck,choker,spiked"
	],
	[
		"Vampire Queen",
		"#4a0a1c,#0e0e14,#c9a24a,#7a0f2e,#2a0a3a",
		"gold,antique brass",
		"crown,gem,rose,bat",
		"baroque,solid,embroidered",
		"Victorian,Ancient",
		"Royal,Gothic",
		"gown,ball gown,cape,exaggerated shoulders,jewels,velvet,brocade,structured,crown,train"
	],
	[
		"Modern Vampire",
		"#0d0d10,#1f1f24,#3b3b45,#6a0e1f,#e8e8ee",
		"silver,chrome,gunmetal",
		"drop,gem",
		"solid,pinstripe",
		"Futuristic",
		"Gothic",
		"leather,minimalist,sleek,column,blazer,slip dress,knee-high boots,stilettos,clean"
	],
	[
		"Blood Red",
		"#a3001b,#5a000f,#ff1f3d,#0e0e0e,#d40f2c",
		"silver,gold",
		"drop,heart,rose",
		"solid,ombre",
		"1980s",
		"Gothic,Romantic",
		"red,crimson,satin,patent leather,bodycon,plunging,cutout,stilettos,sharp"
	],
	[
		"Vampire Bride",
		"#f7f2ec,#0e0e12,#e6dcd2,#7a0f22,#ffffff",
		"silver,gold",
		"rose,cross,pearl",
		"lace,embroidered",
		"Victorian",
		"Gothic,Romantic",
		"white lace,veil,corset,gown,train,lace-up,pearls,high neck,sheer"
	],
	[
		"Bat-inspired",
		"#141018,#2b2133,#4b2e5a,#8a1c3a,#0a080c",
		"gunmetal,silver",
		"bat,moon,web",
		"solid,geometric",
		"Victorian,1980s",
		"Gothic,Fantasy",
		"pointed,cape sleeves,bat,dragon wings,angular,scalloped,asymmetrical,leather,spiked"
	],
	[
		"Baroque Vampire",
		"#3a0a14,#c9a24a,#16110e,#7a2a12,#e8d39a",
		"gold,antique brass",
		"crown,rose,key,gem",
		"baroque,embroidered,check",
		"Victorian,Ancient",
		"Royal,Gothic",
		"brocade,ornate,gold,embroidery,velvet,corset,structured,metallic filigree,epaulettes"
	],
	[
		"Punk Vampire",
		"#0e0e0e,#b0102a,#3c3c3c,#e6e6e6,#5a0d6b",
		"silver,gunmetal",
		"cross,bat,lightning",
		"plaid,check,stripes",
		"1980s",
		"Gothic,Cyberpunk",
		"leather,studs,chains,spikes,distressed,deconstructed,boots,choker,mini skirt,buckles,fishnet,mesh"
	],
	[
		"Glam Vampire",
		"#0c0c10,#3b0f2c,#c0c0d0,#d4af37,#7a0a2a",
		"gold,silver,chrome",
		"gem,sparkle,drop,star",
		"solid,holographic",
		"1920s,1980s",
		"Gothic,Royal",
		"sequins,metallic fabric,rhinestones,glossy,plunging,gown,platform heels,fringe,feathers"
	],
	[
		"Dark Academia Vampire",
		"#2b1d16,#4a2a1e,#1f2a24,#6a1a24,#d8c7a8",
		"antique brass,gold",
		"key,cross,rose",
		"plaid,check,pinstripe",
		"Victorian,1920s",
		"Gothic",
		"wool,tailored,plaid,ties,blazer,trench coat,loafers,pleated skirt,high neck,antique"
	]
]);
var HOGWARTS = build([
	[
		"Classic Slytherin",
		"#1a5e3a,#0e1a14,#c0c7cf,#2c7a4b,#0b0b0b",
		"silver",
		"snake,key,crown",
		"stripes,solid,plaid",
		"1960s,Victorian",
		"Royal,Gothic",
		"tailored,uniform,blazer,pleated skirt,tie,knit,loafers,cape,wool"
	],
	[
		"Dark Academia",
		"#3b2a1e,#6b4a2e,#2a2f24,#7a2a2a,#d6c6a8",
		"antique brass,gold",
		"key,leaf,feather",
		"plaid,check,pinstripe",
		"1920s,Victorian",
		"Gothic",
		"wool,plaid,ties,pleated skirt,leather,trench coat,loafers,knit,tailored,blazer"
	],
	[
		"Light Academia",
		"#f2e8d8,#cfd8c0,#e4d3b6,#b7c4a5,#ffffff",
		"gold",
		"feather,leaf,flower,key",
		"pinstripe,gingham,check",
		"1920s,Victorian",
		"Romantic",
		"cream,knit,cotton,linen,blouse,pleated,cardigan,ballet flats,loafers,tailored"
	],
	[
		"Dark Wizard",
		"#0a0a0c,#1d2420,#2e1a33,#3a4a40,#0f1512",
		"gunmetal,silver",
		"snake,moon,lightning,potion",
		"solid,ombre",
		"Ancient,Victorian",
		"Gothic,Fantasy",
		"robes,cape,cloak,layered,structured,hood,floor-length,trailing,dramatic,asymmetrical"
	],
	[
		"Pureblood Aristocrat",
		"#1a3b2a,#2a0f1f,#c9a24a,#0e1410,#e8e2d0",
		"gold,silver,antique brass",
		"crown,snake,gem,key",
		"baroque,embroidered,check",
		"Victorian",
		"Royal",
		"velvet,brocade,heirloom,tailored,fur coat,structured,gown,crystals,cape,embroidery"
	],
	[
		"Serpentcore",
		"#1f6b3a,#0c1f14,#a7b3ad,#5aa86e,#0a0a0a",
		"silver,gunmetal",
		"snake,gem,drop",
		"snake,scales,ombre",
		"Ancient,Futuristic",
		"Gothic,Fantasy",
		"scale,snake,silver,hardware,bodycon,cutout,coil,chains,leather,latex"
	],
	[
		"Potion Alchemist",
		"#1d4a3a,#4b2a5e,#7a5a9a,#2d6b5a,#c7b26a",
		"antique brass,gold",
		"potion,drop,star,leaf",
		"abstract,ombre,stars",
		"Ancient,Victorian",
		"Fantasy",
		"glass,smoky,velvet,belt bag,chains,charms,layered,draped,apron,cape"
	],
	[
		"Gothic Scholar",
		"#0d0d10,#24242a,#1a3a2a,#d8d0c0,#3a2a33",
		"silver,antique brass",
		"cross,key,feather",
		"lace,pinstripe",
		"Victorian",
		"Gothic",
		"high neck,stand collar,lace,long skirt,maxi skirt,antique,buttons,loafers,tailored"
	],
	[
		"Slytherin Prep",
		"#1f6b44,#e6e6e6,#0e1e16,#a8b0b8,#2e9a5c",
		"silver",
		"snake,star,heart",
		"stripes,plaid,check",
		"1960s,Y2K",
		"Royal",
		"cardigan,loafers,tie,mini skirt,pleated,varsity,knit,polo,knee-high,crop top"
	],
	[
		"Enchanted Forest",
		"#2a4a2a,#4a6b3a,#2a1a2a,#7a3a5a,#9ab87a",
		"antique brass,gold",
		"leaf,flower,mushroom,feather",
		"floral,roses,embroidered",
		"Victorian,Ancient",
		"Fantasy,Romantic",
		"moss,dark florals,velvet,embroidery,layered,cape,draped,woodland"
	],
	[
		"Emerald Royalty",
		"#0f5a3a,#063a24,#d4af37,#2a8a5a,#e8e2c8",
		"gold,silver",
		"crown,gem,snake",
		"baroque,embroidered,solid",
		"Victorian,Ancient",
		"Royal",
		"jewel tones,gown,regal,velvet,crystals,structured,cape,train,corset"
	],
	[
		"Wizarding Formalwear",
		"#0a0a0c,#14301f,#c0c7cf,#2a2a30,#e6e6e6",
		"silver,gold",
		"star,moon,snake",
		"pinstripe,solid",
		"1920s,Victorian",
		"Royal,Gothic",
		"floor-length,robes,tuxedo,tailored,formal,cape,blazer,peak lapel,column,gown"
	]
]);
var NORMAL = build([
	[
		"Minimalist",
		"#f2efe9,#1c1c1c,#bdb6aa,#8a8f94,#ffffff",
		"silver,gold",
		"gem,drop",
		"solid",
		"Futuristic",
		"Royal",
		"clean,simple,column,shift,straight,cotton,silk,minimal,slip dress,tote,loafers"
	],
	[
		"Old Money",
		"#e8dcc4,#1e2b44,#7a6a4a,#f7f3ea,#5a3a2a",
		"gold",
		"key,crown,pearl",
		"pinstripe,check,plaid",
		"1920s,1960s",
		"Royal",
		"tailored,cashmere,wool,loafers,blazer,trench coat,pearls,knit,pleated,top-handle bag"
	],
	[
		"Quiet Luxury",
		"#d9cfc1,#8a7f72,#3a3632,#efe8de,#a49a8e",
		"gold,silver",
		"gem,drop",
		"solid",
		"Futuristic,1960s",
		"Royal",
		"refined,silk,wool,cashmere,muted,minimal,tailored,structured,leather,tote"
	],
	[
		"Coquette",
		"#ffc1d9,#fff0f5,#ff7aa8,#f7d9e6,#c4002b",
		"silver,gold",
		"bow,heart,cherry,pearl",
		"gingham,polka,hearts,lace,cherries",
		"Victorian,1960s,Y2K",
		"Romantic",
		"bows,lace,pink,ribbons,ruffles,sweetheart,puff sleeves,ballet flats,corset,mini skirt"
	],
	[
		"Balletcore",
		"#f7d6dc,#f2ece6,#d8c6e6,#e8bfc8,#ffffff",
		"silver,rose gold",
		"bow,sparkle,heart",
		"solid,ombre",
		"1960s",
		"Romantic",
		"wrap,leg warmers,ballet flats,tulle,ribbons,bodysuit,knit,wrapped,soft,ankle ties"
	],
	[
		"Clean Girl",
		"#f4eee6,#d8c3a5,#ffffff,#b98e6a,#e8d8c8",
		"gold",
		"drop,pearl",
		"solid",
		"Y2K",
		"Romantic",
		"streamlined,monochrome,polished,slip dress,tank top,earrings,gold,simple,fitted"
	],
	[
		"Streetwear",
		"#1c1c1c,#ff5a1f,#e8e8e8,#2f6bff,#c7ff3a",
		"silver,chrome",
		"lightning,star,heart",
		"colorblock,digital,stripes",
		"Y2K,1980s",
		"Cyberpunk",
		"oversized,sneakers,graphic,cargo pants,hoodie,bomber,puffer,belt bag,baggy"
	],
	[
		"Y2K",
		"#ff8ad8,#9be7ff,#c8b6ff,#f2f2f7,#ffe36e",
		"chrome,silver",
		"heart,star,butterfly,sparkle",
		"holographic,iridescent,stars,hearts",
		"Y2K",
		"Cyberpunk",
		"metallic,low-rise,mini bag,tiny,halter,butterfly,rhinestones,platform,mesh,crop top"
	],
	[
		"McBling",
		"#ff4fb3,#ffd1ec,#c9c9d6,#b58cff,#ffffff",
		"silver,chrome,gold",
		"heart,crown,sparkle,gem",
		"holographic,animal,solid",
		"Y2K",
		"Royal",
		"rhinestones,velour,velvet,flashy,pink,glamour,crystals,mini skirt,platform heels,charms"
	],
	[
		"Grunge",
		"#4a4a3a,#6b2a2a,#2a3a4a,#8a7a5a,#1a1a1a",
		"gunmetal,silver",
		"cross,star,flower",
		"plaid,check,abstract",
		"1980s",
		"Gothic",
		"distressed,denim,plaid,layered,knit,deconstructed,boots,slip dress,oversized"
	],
	[
		"Punk",
		"#0e0e0e,#d01a3a,#f2e600,#e8e8e8,#3a3a3a",
		"silver,gunmetal",
		"lightning,cross,star",
		"plaid,check,stripes",
		"1980s",
		"Cyberpunk,Gothic",
		"studs,leather,safety-pin,tartan,spikes,chains,buckles,boots,mini skirt,choker,deconstructed"
	],
	[
		"Goth",
		"#0b0b0d,#2a1a2a,#4a0a1a,#c0c0c8,#1a1a22",
		"silver,gunmetal",
		"cross,bat,moon,web",
		"lace,solid",
		"Victorian,1980s",
		"Gothic",
		"black lace,platform,boots,corset,velvet,mesh,choker,lace-up,spiked"
	],
	[
		"Rocker / Glam Rock",
		"#1a1a1a,#c0c0c8,#7a1aa8,#e6c34a,#a81a2a",
		"silver,gold,chrome",
		"lightning,star,gem",
		"animal,solid,zebra",
		"1980s,1960s",
		"Cyberpunk",
		"leather,metallics,fringe,statement boots,sequins,flares,leather jacket,studs"
	],
	[
		"Office Siren",
		"#1f1f24,#6a6a72,#f2ece6,#7a0e1e,#2a2a44",
		"silver,gold",
		"gem,key",
		"pinstripe,solid,check",
		"1980s",
		"Royal",
		"fitted,blazer,pencil skirt,tailored,pumps,structured,shirt,bodycon,stilettos"
	],
	[
		"Mob Wife",
		"#3a2a1e,#d4af37,#0e0e0e,#7a0e1e,#c8a882",
		"gold",
		"gem,crown,heart",
		"animal,zebra,solid",
		"1980s",
		"Royal",
		"faux fur,fur coat,animal print,gold,leopard,bold,oversized,stilettos,bodycon"
	],
	[
		"Baddie",
		"#0e0e0e,#d6b89a,#ff3a8a,#ffffff,#8a5a3a",
		"gold,silver",
		"heart,gem,lightning",
		"solid,animal",
		"Y2K",
		"Cyberpunk",
		"bodycon,coordinated,cutout,corset,platform heels,mini bag,statement,latex"
	],
	[
		"Street Chic",
		"#e8e2d6,#1c1c1c,#8a7a6a,#4a5a6a,#c8b8a0",
		"gold,silver",
		"gem,star",
		"solid,pinstripe",
		"Y2K",
		"Royal",
		"polished,structured,trench coat,blazer,loafers,tote,wide-leg,tailored,layered"
	],
	[
		"Preppy",
		"#1e3a6b,#ffffff,#c8102e,#7ab8e6,#2a6b3a",
		"gold",
		"heart,star,bow,cherry",
		"stripes,plaid,gingham",
		"1960s",
		"Royal",
		"polo,pleated skirt,knit,loafers,cardigan,blazer,collared,headband,mini skirt"
	],
	[
		"Business Formal",
		"#1c1f2a,#3a3f4a,#f2f2f2,#5a4a3a,#0e0e0e",
		"silver,gold",
		"key,gem",
		"pinstripe,solid",
		"1980s",
		"Royal",
		"suits,trousers,blazer,structured,pumps,tailored,shirt,pencil skirt"
	],
	[
		"Romantic",
		"#f6c6d0,#fff2f0,#c9a6c4,#e89aa8,#fff9e6",
		"gold,rose gold",
		"rose,flower,heart,bow",
		"floral,roses,lace",
		"Victorian",
		"Romantic",
		"draping,soft,florals,chiffon,lace,ruffles,off-shoulder,puff sleeves,midi"
	],
	[
		"Bohemian",
		"#c8763a,#e8c89a,#6a7a3a,#a83a2a,#f2e6d0",
		"gold,antique brass",
		"feather,flower,sparkle,leaf",
		"embroidered,floral,abstract",
		"1960s",
		"Fantasy",
		"flowing,fringe,embroidery,suede,maxi skirt,bell sleeves,tiered,feathers,beads,wrapped"
	],
	[
		"Western / Cowgirl",
		"#a8743a,#3a5a8a,#f2e6d0,#7a2a1a,#2a2a2a",
		"silver,antique brass",
		"star,heart,feather",
		"check,gingham,embroidered",
		"1960s,1980s",
		"Fantasy",
		"denim,boots,fringe,suede,belts,buckles,cowboy,chaps,leather,knee-high boots"
	],
	[
		"Cottagecore",
		"#f2e6c8,#b8d0a0,#f4c6c6,#e8f0f8,#8a6a4a",
		"gold,antique brass",
		"flower,cherry,mushroom,leaf",
		"gingham,floral,embroidered",
		"Victorian,1960s",
		"Romantic",
		"gingham,puff sleeves,florals,linen,cotton,midi,ruffles,tiered,apron,basket"
	],
	[
		"Dark Feminine",
		"#0e0e0e,#5a0e22,#2a1a2a,#c8a882,#3a0a14",
		"gold,silver",
		"rose,drop,gem",
		"solid,lace",
		"1920s,1980s",
		"Gothic,Romantic",
		"fitted,black,burgundy,satin,corset,bodycon,stilettos,plunging,slit,elegant"
	],
	[
		"Vintage / Retro",
		"#e86a5a,#f2d06a,#5aa8a0,#f2ead8,#3a5a8a",
		"gold",
		"cherry,heart,flower,star",
		"polka,gingham,floral,check",
		"1920s,1960s,1980s",
		"Romantic",
		"a-line,retro,cat-eye,swing,tea dress,cardigan,pumps,peplum,cocktail dress"
	],
	[
		"Mod / 1960s",
		"#ff7a00,#ffffff,#0e0e0e,#ff4fa3,#2aa8ff",
		"silver,chrome",
		"star,flower,heart",
		"geometric,check,stripes,colorblock",
		"1960s",
		"Cyberpunk",
		"geometric,shift,go-go boots,mini dress,a-line,plastic,acrylic,micro,color-blocked"
	],
	[
		"Disco / 1970s",
		"#d4af37,#ff6a3a,#a83aff,#ffdb6a,#c0c0d0",
		"gold,chrome",
		"star,sparkle,lightning",
		"holographic,stripes,ombre",
		"1960s,1980s",
		"Celestial",
		"flares,sequins,metallics,bell-bottom,halter,platform,jumpsuit,fringe,metallic fabric"
	],
	[
		"80s Power Dressing",
		"#ff2a6a,#2a3aff,#ffd200,#0e0e0e,#ffffff",
		"gold",
		"gem,star,lightning",
		"colorblock,geometric,solid",
		"1980s",
		"Royal",
		"exaggerated shoulders,saturated,statement,blazer,pencil skirt,structured,oversized,belt"
	],
	[
		"90s Supermodel",
		"#0e0e0e,#f2ece2,#c8b8a0,#7a5a4a,#d8d0c8",
		"silver,gold",
		"drop,gem",
		"solid",
		"1980s,Y2K",
		"Romantic",
		"slip dress,leather jacket,minimal,satin,bias,column,tank top,straight"
	],
	[
		"Sporty / Athleisure",
		"#ffffff,#1c1c1c,#3aa8ff,#ff3a6a,#c7ff3a",
		"silver,chrome",
		"lightning,star",
		"stripes,colorblock,solid",
		"Y2K,Futuristic",
		"Cyberpunk",
		"activewear,sneakers,technical,leggings,bodysuit,crop top,zipper,mesh,bomber"
	],
	[
		"Denim on Denim",
		"#3a5a8a,#6a8ab8,#1e2e4a,#a8c0de,#e8e2d6",
		"silver,antique brass",
		"star,heart",
		"solid,check",
		"1980s,Y2K",
		"Fantasy",
		"denim,jeans,contrast stitching,jacket,wide-leg,shorts,buttons,pockets"
	],
	[
		"Lingerie-inspired",
		"#f4d6d6,#0e0e0e,#c8102e,#f2e6e0,#8a3a5a",
		"gold,rose gold",
		"bow,heart,rose,pearl",
		"lace,solid",
		"1920s",
		"Romantic",
		"corset,corsetry,satin,lace,slip dress,bralette,bustier,sheer,mesh,lace-up,bows"
	],
	[
		"Avant-Garde",
		"#0e0e0e,#ffffff,#ff2a2a,#8a8a8a,#2a2aff",
		"chrome,silver",
		"gem,lightning,web",
		"abstract,geometric,colorblock",
		"Futuristic",
		"Alien",
		"sculptural,experimental,deconstructed,exaggerated,asymmetrical,architectural,oversized,unusual"
	],
	[
		"High Fashion / Couture",
		"#c8102e,#0e0e0e,#f2e6d6,#d4af37,#6a1aa8",
		"gold,silver",
		"rose,gem,feather,crown",
		"baroque,embroidered,solid,lace",
		"1920s,Victorian",
		"Royal",
		"intricate,dramatic,gown,train,feathers,embroidery,crystals,structured,sculptural,beading"
	],
	[
		"Futuristic / Techwear",
		"#1c1c22,#3a3a44,#c7ff3a,#8a8a9a,#e6ecf5",
		"chrome,gunmetal",
		"lightning,gem",
		"digital,solid,colorblock",
		"Futuristic",
		"Cyberpunk",
		"technical,hardware,modular,sleek,zipper,straps,buckles,cargo pants,parka,vinyl,belt bag"
	],
	[
		"Cyberpunk",
		"#0a0a14,#ff2aa8,#2affea,#7a2aff,#e6ff2a",
		"chrome,gunmetal",
		"lightning,gem,star",
		"digital,holographic,ombre",
		"Futuristic",
		"Cyberpunk",
		"neon,leds,metallic,synthetic,latex,vinyl,mesh,platform,chrome,transparent pvc,cutout"
	],
	[
		"Punk Lolita",
		"#0e0e0e,#c8102e,#f2e6e6,#5a0a2a,#3a3a3a",
		"silver,gunmetal",
		"bow,cross,heart,bat",
		"plaid,lace,check",
		"Victorian,1980s",
		"Gothic",
		"structured,tiered,layered,tartan,bows,lace,platform,buckles,ruffles,petticoat"
	],
	[
		"Kawaii",
		"#ffb3d9,#b3e6ff,#fff2a8,#d9b3ff,#b3ffd9",
		"silver,rose gold",
		"heart,star,bow,cherry,mushroom",
		"polka,hearts,stars,cherries",
		"Y2K",
		"Fantasy",
		"playful,pastel,cute,bows,charms,mini bag,puff sleeves,platform,ruffles,animal-shaped"
	],
	[
		"Harajuku",
		"#ff3a8a,#3affd2,#ffe23a,#8a3aff,#ff8a3a",
		"silver,chrome",
		"star,heart,lightning,sparkle",
		"multicolor,digital,polka,stripes",
		"Y2K,1980s",
		"Fantasy,Cyberpunk",
		"experimental,layering,colorful,eclectic,platform,charms,mismatched,leg warmers,layered"
	],
	[
		"Japanese Streetwear",
		"#1c1c1c,#e8e2d6,#6a6a5a,#a83a2a,#3a4a5a",
		"gunmetal,silver",
		"lightning,star",
		"colorblock,geometric,check",
		"Futuristic,1980s",
		"Cyberpunk",
		"oversized,tailoring,layered,graphic,wide-leg,wrap,deconstructed,asymmetrical,boxy"
	],
	[
		"Gorpcore",
		"#5a6a3a,#e86a2a,#2a3a4a,#c8b88a,#1c1c1c",
		"gunmetal",
		"leaf,lightning",
		"colorblock,digital",
		"Futuristic",
		"Fantasy",
		"outdoor,utility,pockets,technical,parka,puffer,cargo pants,sneakers,zipper,belt bag,backpack"
	],
	[
		"Luxe Resortwear",
		"#f2e6d0,#2aa8a8,#e8a86a,#ffffff,#d4af37",
		"gold",
		"shell,leaf,flower",
		"tropical,stripes,solid",
		"1960s",
		"Underwater",
		"linen,flowing,maxi dress,gold,sandals,wrap,silk,tote,straw,kaftan"
	],
	[
		"Red Carpet Glamour",
		"#c8102e,#0e0e0e,#d4af37,#f2e6e6,#2a1a5a",
		"gold,silver,chrome",
		"gem,sparkle,star",
		"solid,holographic",
		"1920s",
		"Royal",
		"gown,high heels,jewelry,statement,sequins,crystals,train,plunging,mermaid,satin"
	],
	[
		"Bridal",
		"#ffffff,#f7f0e4,#f2e6d6,#e8dcc8,#fff9f0",
		"silver,gold",
		"pearl,flower,rose,bow",
		"lace,embroidered,solid",
		"Victorian,1920s",
		"Romantic,Royal",
		"white,ivory,lace,veil,structured,gown,ball gown,train,pearls,tulle,satin"
	],
	[
		"Festival Fashion",
		"#ff6a3a,#3affc8,#c8a8ff,#ffd23a,#ff3aa8",
		"silver,gold,chrome",
		"star,sparkle,butterfly,lightning",
		"holographic,multicolor,abstract",
		"Y2K,1960s",
		"Celestial,Fantasy",
		"fringe,mesh,metallics,bold,layering,crop top,shorts,boots,body chain,waist chain"
	]
]);
var SUBSTYLES = {
	mermaid: MERMAID,
	fairy: FAIRY,
	vampire: VAMPIRE,
	hogwarts: HOGWARTS,
	normal: NORMAL
};
var ALL = Object.values(SUBSTYLES).flat();
var BY_NAME = new Map(ALL.map((p) => [p.name, p]));
/** Profile for a substyle name; old saves with unknown names fall back to Minimalist. */
function profile(name) {
	return BY_NAME.get(name) ?? NORMAL[0];
}
//#endregion
//#region app/lib/items.ts
/** Overlay order, farthest back first (PRD Feature 3). */
var CATEGORIES = [
	"wings",
	"shoes",
	"bottoms",
	"tops",
	"dresses",
	"jewelry",
	"coats",
	"bags"
];
var SCHEMA = {
	jewelry: {
		types: [
			"Earrings",
			"Bracelet",
			"Necklace",
			"Choker",
			"Ring",
			"Anklet",
			"Waist chain"
		],
		sizeLabel: "Length / Size",
		sizes: [
			"Micro",
			"Small",
			"Medium",
			"Large",
			"Oversized",
			"Body-length"
		],
		params: {
			Fit: ["Fixed", "Adjustable"],
			Material: [
				"Gold",
				"Silver",
				"Chrome",
				"Pearls",
				"Crystals",
				"Gemstones",
				"Plastic",
				"Glass",
				"Leather",
				"Fabric",
				"Organic materials"
			],
			"Shape / Motif": [
				"Geometric",
				"Floral",
				"Organic",
				"Celestial",
				"Animal",
				"Abstract",
				"Architectural",
				"Tribal"
			],
			Silhouette: [
				"Delicate",
				"Chunky",
				"Layered",
				"Cascading",
				"Sculptural",
				"Asymmetrical",
				"Spiked"
			],
			Embellishment: [
				"Rhinestones",
				"Chains",
				"Charms",
				"Feathers",
				"Pearls",
				"Fringe",
				"Enamel",
				"LEDs"
			],
			Placement: [
				"Ears",
				"Neck",
				"Wrists",
				"Fingers",
				"Waist",
				"Shoulders",
				"Face",
				"Full body",
				"Ankles"
			]
		},
		optional: ["Embellishment"]
	},
	dresses: {
		types: [
			"Mini dress",
			"Midi dress",
			"Maxi dress",
			"Gown",
			"Cocktail dress",
			"Slip dress",
			"Bodycon",
			"Ball gown",
			"Corset dress",
			"Blazer dress",
			"Cutout dress",
			"Asymmetrical dress"
		],
		sizeLabel: "Length",
		sizes: [
			"Micro",
			"Mini",
			"Above-knee",
			"Knee-length",
			"Midi",
			"Ankle-length",
			"Floor-length",
			"Train"
		],
		params: {
			Silhouette: [
				"Bodycon",
				"A-line",
				"Mermaid",
				"Column",
				"Ball gown",
				"Empire waist",
				"Shift",
				"Peplum",
				"Oversized",
				"Sculptural"
			],
			Neckline: [
				"Strapless",
				"Sweetheart",
				"V-neck",
				"Square",
				"Halter",
				"Cowl",
				"High neck",
				"Off-shoulder",
				"Asymmetrical",
				"Plunging"
			],
			Sleeves: [
				"Sleeveless",
				"Spaghetti straps",
				"Cap sleeves",
				"Puff sleeves",
				"Long sleeves",
				"Bell sleeves",
				"Detached sleeves",
				"One sleeve"
			],
			"Back Design": [
				"Open back",
				"Low back",
				"Lace-up",
				"Cross-back",
				"Backless",
				"Keyhole",
				"Sculptural"
			],
			Material: [
				"Satin",
				"Silk",
				"Velvet",
				"Lace",
				"Chiffon",
				"Tulle",
				"Latex",
				"Leather",
				"Denim",
				"Mesh",
				"Sequins",
				"Metallic fabric"
			],
			Color: [
				"Primary color",
				"Secondary color",
				"Gradient",
				"Multicolor",
				"Iridescent",
				"Metallic",
				"Transparent"
			],
			Pattern: [
				"Solid",
				"Floral",
				"Animal print",
				"Stripes",
				"Geometric",
				"Abstract",
				"Baroque",
				"Digital",
				"Holographic"
			],
			Construction: [
				"Draped",
				"Pleated",
				"Ruched",
				"Layered",
				"Paneled",
				"Structured",
				"Deconstructed",
				"Wrapped"
			],
			Cutouts: [
				"Waist",
				"Hips",
				"Chest",
				"Back",
				"Side",
				"Full-body cutouts"
			],
			Embellishment: [
				"Beading",
				"Crystals",
				"Feathers",
				"Fringe",
				"Ruffles",
				"Bows",
				"Appliqué",
				"Embroidery",
				"Chains"
			]
		},
		optional: ["Cutouts", "Embellishment"]
	},
	tops: {
		types: [
			"T-shirt",
			"Blouse",
			"Crop top",
			"Corset",
			"Bustier",
			"Tube top",
			"Halter",
			"Bodysuit",
			"Bralette",
			"Tank top",
			"Shirt",
			"Tunic",
			"Peplum top",
			"Sculptural top"
		],
		sizeLabel: "Length",
		sizes: [
			"Micro crop",
			"Cropped",
			"Waist-length",
			"Hip-length",
			"Tunic-length",
			"Oversized"
		],
		params: {
			Fit: [
				"Skin-tight",
				"Fitted",
				"Regular",
				"Relaxed",
				"Oversized",
				"Exaggerated"
			],
			Neckline: [
				"Crew",
				"V-neck",
				"Square",
				"Sweetheart",
				"Halter",
				"Cowl",
				"High neck",
				"Off-shoulder",
				"Asymmetrical"
			],
			Sleeves: [
				"Sleeveless",
				"Cap",
				"Short",
				"Long",
				"Puff",
				"Bell",
				"Balloon",
				"Detached",
				"One sleeve",
				"Exaggerated"
			],
			"Back Design": [
				"Open back",
				"Lace-up",
				"Cross-back",
				"Low back",
				"Cutout",
				"Asymmetrical"
			],
			Material: [
				"Cotton",
				"Silk",
				"Satin",
				"Mesh",
				"Lace",
				"Leather",
				"Denim",
				"Knit",
				"Latex",
				"Metallic fabric",
				"Organza"
			],
			"Color / Pattern": [
				"Solid",
				"Color-blocked",
				"Gradient",
				"Striped",
				"Printed",
				"Holographic",
				"Iridescent"
			],
			Construction: [
				"Corseted",
				"Draped",
				"Wrapped",
				"Layered",
				"Ruched",
				"Pleated",
				"Structured",
				"Deconstructed"
			],
			Embellishment: [
				"Crystals",
				"Chains",
				"Feathers",
				"Fringe",
				"Bows",
				"Embroidery",
				"Appliqué",
				"Studs"
			]
		},
		optional: ["Embellishment"]
	},
	bottoms: {
		types: [
			"Mini skirt",
			"Midi skirt",
			"Maxi skirt",
			"Pencil skirt",
			"Pleated skirt",
			"Shorts",
			"Hot pants",
			"Trousers",
			"Jeans",
			"Cargo pants",
			"Leggings",
			"Flares",
			"Wide-leg pants",
			"Harem pants",
			"Chaps"
		],
		sizeLabel: "Length",
		sizes: [
			"Micro",
			"Mini",
			"Above-knee",
			"Knee-length",
			"Midi",
			"Ankle-length",
			"Floor-length",
			"Trailing"
		],
		params: {
			Waistline: [
				"Low-rise",
				"Mid-rise",
				"High-rise",
				"Ultra-high-rise",
				"Asymmetrical"
			],
			"Fit / Silhouette": [
				"Skinny",
				"Straight",
				"Slim",
				"Wide-leg",
				"Baggy",
				"Flared",
				"Bell-bottom",
				"Balloon",
				"Tapered",
				"Sculptural"
			],
			"Rise / Coverage": [
				"Low coverage",
				"Standard",
				"Full coverage",
				"Layered",
				"Asymmetric"
			],
			Material: [
				"Denim",
				"Leather",
				"Satin",
				"Silk",
				"Velvet",
				"Mesh",
				"Lace",
				"Knit",
				"Latex",
				"Tulle",
				"Metallic fabric"
			],
			Construction: [
				"Pleated",
				"Wrapped",
				"Draped",
				"Ruched",
				"Paneled",
				"Tiered",
				"Split",
				"Deconstructed"
			],
			"Leg / Hem Design": [
				"Straight",
				"Flared",
				"Cuffed",
				"Slit",
				"Asymmetrical",
				"Fringed",
				"Trailing",
				"Detachable"
			],
			Details: [
				"Pockets",
				"Straps",
				"Buckles",
				"Chains",
				"Cutouts",
				"Lacing",
				"Crystals",
				"Embroidery",
				"Fringe"
			],
			"Color / Pattern": [
				"Solid",
				"Gradient",
				"Animal print",
				"Plaid",
				"Floral",
				"Geometric",
				"Holographic"
			]
		},
		optional: ["Details"]
	},
	coats: {
		types: [
			"Trench coat",
			"Blazer",
			"Pea coat",
			"Overcoat",
			"Cape",
			"Cloak",
			"Puffer",
			"Parka",
			"Leather jacket",
			"Bomber",
			"Bolero",
			"Duster",
			"Fur coat",
			"Military coat",
			"Sculptural coat"
		],
		sizeLabel: "Length",
		sizes: [
			"Cropped",
			"Waist-length",
			"Hip-length",
			"Thigh-length",
			"Knee-length",
			"Calf-length",
			"Floor-length",
			"Trailing"
		],
		params: {
			Silhouette: [
				"Fitted",
				"Tailored",
				"Oversized",
				"Boxy",
				"Cocoon",
				"A-line",
				"Structured",
				"Exaggerated shoulders"
			],
			"Collar / Neck": [
				"Notched lapel",
				"Peak lapel",
				"Shawl collar",
				"Stand collar",
				"Funnel neck",
				"Hood",
				"Oversized collar",
				"Collarless"
			],
			Sleeves: [
				"Fitted",
				"Oversized",
				"Puff",
				"Bell",
				"Cape sleeves",
				"Detachable",
				"Extra-long",
				"Sleeveless"
			],
			Closure: [
				"Buttons",
				"Zipper",
				"Double-breasted",
				"Wrap",
				"Belt",
				"Buckle",
				"Hook-and-eye",
				"Open-front",
				"Asymmetrical"
			],
			Material: [
				"Wool",
				"Leather",
				"Faux fur",
				"Velvet",
				"Satin",
				"Denim",
				"Vinyl",
				"Quilted fabric",
				"Metallic textile",
				"Translucent fabric"
			],
			"Color / Pattern": [
				"Solid",
				"Color-blocked",
				"Plaid",
				"Animal print",
				"Gradient",
				"Embroidered",
				"Iridescent"
			],
			Structure: [
				"Soft",
				"Padded",
				"Corseted",
				"Armored",
				"Quilted",
				"Layered",
				"Sculptural",
				"Deconstructed"
			],
			Details: [
				"Epaulettes",
				"Belts",
				"Chains",
				"Fringe",
				"Feathers",
				"Oversized pockets",
				"Crystals",
				"Embroidery",
				"Detachable trains"
			]
		},
		optional: ["Details"]
	},
	shoes: {
		types: [
			"Stilettos",
			"Pumps",
			"Platform heels",
			"Boots",
			"Ankle boots",
			"Knee-high boots",
			"Thigh-high boots",
			"Sandals",
			"Flats",
			"Ballet flats",
			"Loafers",
			"Sneakers",
			"Gladiator sandals",
			"Mules",
			"Wedges",
			"Sculptural heels"
		],
		sizeLabel: "Shaft Height",
		sizes: [
			"No shaft",
			"Ankle",
			"Mid-calf",
			"Knee",
			"Over-the-knee",
			"Thigh"
		],
		params: {
			"Heel Height": [
				"Flat",
				"Low",
				"Medium",
				"High",
				"Extreme",
				"Platform"
			],
			"Toe Shape": [
				"Pointed",
				"Round",
				"Square",
				"Almond",
				"Open toe",
				"Split toe",
				"Sculptural"
			],
			Silhouette: [
				"Sleek",
				"Chunky",
				"Delicate",
				"Exaggerated",
				"Architectural",
				"Armored",
				"Elongated"
			],
			Material: [
				"Leather",
				"Suede",
				"Satin",
				"Velvet",
				"Mesh",
				"Lace",
				"Patent leather",
				"Chrome",
				"Transparent PVC",
				"Feathers"
			],
			"Color / Pattern": [
				"Solid",
				"Multicolor",
				"Metallic",
				"Gradient",
				"Animal print",
				"Holographic",
				"Iridescent"
			],
			"Sole / Heel Design": [
				"Stiletto",
				"Block",
				"Wedge",
				"Platform",
				"Curved",
				"Transparent",
				"Floating",
				"Sculptural"
			],
			Fastening: [
				"Lace-up",
				"Buckle",
				"Zipper",
				"Straps",
				"Ribbons",
				"Slip-on",
				"Wraparound",
				"Ankle ties"
			],
			Embellishment: [
				"Crystals",
				"Chains",
				"Bows",
				"Pearls",
				"Spikes",
				"Feathers",
				"Flowers",
				"Fringe",
				"Hardware"
			]
		},
		optional: ["Embellishment"]
	},
	bags: {
		types: [
			"Clutch",
			"Shoulder bag",
			"Tote",
			"Crossbody",
			"Mini bag",
			"Hobo bag",
			"Bucket bag",
			"Backpack",
			"Minaudière",
			"Top-handle bag",
			"Belt bag",
			"Sculptural bag"
		],
		sizeLabel: "Size",
		sizes: [
			"Micro",
			"Mini",
			"Small",
			"Medium",
			"Oversized",
			"Giant"
		],
		params: {
			Capacity: ["Fixed", "Expandable"],
			Shape: [
				"Rectangular",
				"Square",
				"Round",
				"Oval",
				"Crescent",
				"Spherical",
				"Geometric",
				"Organic",
				"Abstract",
				"Animal-shaped"
			],
			Structure: [
				"Soft",
				"Slouchy",
				"Structured",
				"Rigid",
				"Quilted",
				"Sculptural",
				"Transparent"
			],
			Material: [
				"Leather",
				"Suede",
				"Satin",
				"Velvet",
				"Denim",
				"Mesh",
				"Acrylic",
				"Metal",
				"Beads",
				"Feathers",
				"Faux fur",
				"Transparent PVC"
			],
			"Color / Pattern": [
				"Solid",
				"Multicolor",
				"Gradient",
				"Metallic",
				"Animal print",
				"Holographic",
				"Iridescent"
			],
			"Handle / Strap": [
				"Top handle",
				"Shoulder strap",
				"Crossbody strap",
				"Chain strap",
				"Wristlet",
				"No handle",
				"Multiple straps"
			],
			Details: [
				"Crystals",
				"Pearls",
				"Chains",
				"Charms",
				"Embroidery",
				"Fringe",
				"Feathers",
				"Spikes",
				"Sculptural hardware"
			]
		},
		optional: ["Details"]
	},
	wings: {
		types: [
			"Feather wings",
			"Angel wings",
			"Butterfly wings",
			"Insect wings",
			"Dragon wings",
			"Bird wings",
			"Crystal wings",
			"Metallic wings",
			"Fantasy wings",
			"Abstract sculptural wings"
		],
		sizeLabel: "Span / Size",
		sizes: [
			"Compact",
			"Shoulder-width",
			"Wide",
			"Oversized",
			"Full runway",
			"Floor-length",
			"Towering"
		],
		params: {
			Shape: [
				"Rounded",
				"Pointed",
				"Fan-shaped",
				"Feathered",
				"Tapered",
				"Layered",
				"Curved",
				"Angular",
				"Asymmetrical",
				"Radial"
			],
			Structure: [
				"Single pair",
				"Double pair",
				"Multi-tiered",
				"Segmented",
				"Skeletal frame",
				"Floating panels",
				"Articulated"
			],
			Material: [
				"Feathers",
				"Organza",
				"Tulle",
				"Chiffon",
				"Silk",
				"Wire",
				"Acrylic",
				"Metal",
				"Crystals",
				"Sequins",
				"Iridescent film"
			],
			Color: [
				"Monochrome",
				"Gradient",
				"Ombré",
				"Multicolor",
				"Metallic",
				"Pastel",
				"Jewel tones",
				"Iridescent",
				"Translucent"
			],
			"Feather Style": [
				"Soft down",
				"Layered feathers",
				"Long plumes",
				"Ostrich feathers",
				"Peacock feathers",
				"Graphic feathers",
				"Feather tips"
			],
			"Surface Details": [
				"Crystals",
				"Rhinestones",
				"Pearls",
				"Glitter",
				"Embroidery",
				"Sequins",
				"Metallic filigree",
				"LED lights"
			],
			Attachment: [
				"Back-mounted",
				"Shoulder-mounted",
				"Arm-mounted",
				"Harness",
				"Corset-integrated",
				"Floating illusion"
			],
			Movement: [
				"Static",
				"Fluttering",
				"Flexible",
				"Articulated",
				"Cascading",
				"Rotating",
				"Light-reactive"
			],
			Symmetry: [
				"Symmetrical",
				"Asymmetrical",
				"One-winged",
				"Mismatched",
				"Multi-directional"
			],
			Outline: [
				"Clean",
				"Feathery",
				"Spiked",
				"Scalloped",
				"Flame-shaped",
				"Floral",
				"Geometric",
				"Organic"
			],
			"Secondary Elements": [
				"Hanging chains",
				"Ribbons",
				"Fabric drapes",
				"Trailing feathers",
				"Streamers",
				"Detachable ornaments"
			]
		},
		optional: ["Surface Details", "Secondary Elements"]
	}
};
/** Universal parameters for every category (PRD table + the two optional extras). */
var UNIVERSAL = {
	"Color palette": [
		"Signature",
		"Pastel",
		"Jewel tones",
		"Monochrome",
		"Earthy",
		"Neon",
		"Muted",
		"Metallic",
		"Icy",
		"Warm",
		"Cool"
	],
	"Color relation": [
		"Complementary",
		"Contrasting",
		"Tonal"
	],
	Finish: [
		"Matte",
		"Glossy",
		"Satin",
		"Metallic",
		"Iridescent",
		"Translucent"
	],
	"Material mix": [
		"Single material",
		"Two materials",
		"Mixed materials"
	],
	"Pattern scale": [
		"Tiny",
		"Medium",
		"Oversized",
		"All-over"
	],
	"Detail density": [
		"Minimal",
		"Moderate",
		"Ornate",
		"Maximalist"
	],
	Symmetry: [
		"Symmetrical",
		"Asymmetrical",
		"Mismatched"
	],
	"Shape language": [
		"Organic",
		"Geometric",
		"Angular",
		"Fluid",
		"Architectural"
	],
	Era: [...ERAS],
	"World style": [...WORLD_STYLES],
	Exaggeration: [
		"Subtle",
		"Standard",
		"Exaggerated",
		"Extreme couture"
	],
	Layering: [
		"None",
		"Light",
		"Moderate",
		"Heavy",
		"Cascading"
	],
	Transparency: [
		"Opaque",
		"Sheer",
		"Translucent",
		"Transparent",
		"Mixed"
	],
	Wearability: [
		"Everyday",
		"Editorial",
		"Runway",
		"Fantasy costume"
	],
	"Style intensity": [
		"Subtle",
		"Recognizable",
		"Dramatic",
		"Maximalist",
		"Editorial"
	]
};
/**
* "Signature feature: one standout design element unique to the item."
* Every entry here has dedicated art in components/garments.
*/
var SIGNATURES = {
	dresses: [
		"Oversized bow",
		"Sweeping train",
		"Corset lacing",
		"Feather hem",
		"Crystal collar",
		"Cascading ruffles",
		"Draped sash",
		"Motif brooch",
		"Lace collar",
		"Sailor collar",
		"Ribbon tie"
	],
	tops: [
		"Oversized bow",
		"Corset lacing",
		"Crystal collar",
		"Cascading ruffles",
		"Draped sash",
		"Motif brooch",
		"Statement cuffs",
		"Lace collar",
		"Sailor collar",
		"Ribbon tie"
	],
	bottoms: [
		"Lace-up sides",
		"Oversized belt",
		"Chain drape",
		"Ruffle hem",
		"Motif patch",
		"Contrast cuffs"
	],
	coats: [
		"Giant collar",
		"Contrast lining",
		"Fur trim",
		"Motif brooch",
		"Sweeping train",
		"Statement cuffs",
		"Contrast binding"
	],
	shoes: [
		"Oversized bow",
		"Motif heel",
		"Crystal toe",
		"Ankle wings",
		"Ribbon ties",
		"Pearl strap"
	],
	bags: [
		"Motif charm",
		"Oversized bow",
		"Crystal clasp",
		"Fringe curtain",
		"Tassel",
		"Motif clasp"
	],
	jewelry: [
		"Giant pendant",
		"Drop cascade",
		"Crystal cluster",
		"Mismatched pair",
		"Layered strands",
		"Spikes"
	],
	wings: [
		"Jewel at root",
		"Trailing plumes",
		"Halo ring",
		"Gradient tips",
		"Eyespots",
		"Sparkle trail"
	]
};
/**
* Relative odds for specific options (default 1). Keeps novelty variants (one wing, arm-mounted…)
* possible but rare, so most pulls read as the classic version of the piece.
*/
var PARAM_BIAS = {
	wings: {
		Attachment: {
			"Back-mounted": 5,
			"Shoulder-mounted": 2,
			Harness: 1.5,
			"Corset-integrated": .8,
			"Arm-mounted": .4,
			"Floating illusion": 1
		},
		Symmetry: {
			Symmetrical: 6,
			Asymmetrical: 1.2,
			"One-winged": .35,
			Mismatched: .7,
			"Multi-directional": .6
		},
		Structure: {
			"Single pair": 4,
			"Double pair": 2,
			"Multi-tiered": 1.2,
			Segmented: .8,
			"Skeletal frame": .6,
			"Floating panels": .7,
			Articulated: 1
		},
		Movement: {
			Static: 1.5,
			Fluttering: 3,
			Flexible: 1.5
		}
	},
	dresses: { Cutouts: {
		"Full-body cutouts": .4,
		Back: .6
	} },
	bottoms: {
		"Rise / Coverage": {
			Standard: 3,
			"Full coverage": 1.5,
			Asymmetric: .4,
			"Low coverage": .6
		},
		"Leg / Hem Design": {
			Straight: 3,
			Flared: 1.5,
			Asymmetrical: .4,
			Trailing: .7,
			Detachable: .5
		}
	},
	coats: { Closure: {
		"Open-front": 2.5,
		Belt: 1.5
	} },
	jewelry: { Placement: {
		Neck: 3,
		Ears: 2.5,
		Wrists: 1.5
	} }
};
/** Minimum size index per category (wings are runway pieces: never tiny by default). */
var MIN_SIZE = { wings: 1 };
var TYPE_RULES = {
	dresses: {
		"Mini dress": { size: ["Micro", "Above-knee"] },
		"Midi dress": { size: ["Knee-length", "Midi"] },
		"Maxi dress": {
			size: ["Ankle-length", "Floor-length"],
			fix: { Silhouette: [
				"A-line",
				"Column",
				"Empire waist",
				"Mermaid",
				"Oversized"
			] }
		},
		Gown: { size: ["Floor-length", "Train"] },
		"Cocktail dress": {
			size: ["Mini", "Knee-length"],
			fix: { Silhouette: [
				"A-line",
				"Bodycon",
				"Peplum",
				"Sculptural",
				"Ball gown"
			] }
		},
		"Slip dress": { fix: {
			Sleeves: ["Spaghetti straps"],
			Neckline: [
				"V-neck",
				"Cowl",
				"Square",
				"Sweetheart",
				"Plunging"
			],
			Silhouette: [
				"Column",
				"Bodycon",
				"A-line",
				"Shift"
			]
		} },
		Bodycon: {
			size: ["Micro", "Midi"],
			fix: { Silhouette: ["Bodycon"] }
		},
		"Ball gown": {
			size: ["Floor-length", "Train"],
			fix: { Silhouette: ["Ball gown"] }
		},
		"Corset dress": { fix: {
			Construction: ["Structured"],
			Neckline: [
				"Strapless",
				"Sweetheart",
				"Square",
				"Plunging",
				"Off-shoulder"
			]
		} },
		"Blazer dress": {
			size: ["Micro", "Knee-length"],
			fix: {
				Neckline: ["V-neck", "Plunging"],
				Sleeves: [
					"Long sleeves",
					"Puff sleeves",
					"Sleeveless"
				],
				Silhouette: [
					"Shift",
					"Bodycon",
					"Oversized",
					"Peplum"
				]
			}
		},
		"Cutout dress": { fix: { Cutouts: [
			"Waist",
			"Hips",
			"Chest",
			"Side",
			"Full-body cutouts"
		] } },
		"Asymmetrical dress": { fix: { Neckline: [
			"Asymmetrical",
			"Halter",
			"Off-shoulder"
		] } }
	},
	tops: {
		"T-shirt": { fix: {
			Neckline: [
				"Crew",
				"V-neck",
				"Square"
			],
			Sleeves: [
				"Short",
				"Cap",
				"Long"
			],
			Fit: [
				"Fitted",
				"Regular",
				"Relaxed",
				"Oversized"
			]
		} },
		Blouse: { fix: {
			Sleeves: [
				"Puff",
				"Bell",
				"Balloon",
				"Long",
				"Short",
				"Exaggerated"
			],
			Fit: [
				"Regular",
				"Relaxed",
				"Fitted"
			]
		} },
		"Crop top": { size: ["Micro crop", "Cropped"] },
		Corset: {
			size: ["Cropped", "Hip-length"],
			fix: {
				Neckline: [
					"Sweetheart",
					"Square",
					"Off-shoulder"
				],
				Construction: ["Corseted", "Structured"],
				Fit: ["Skin-tight", "Fitted"]
			}
		},
		Bustier: {
			size: ["Micro crop", "Waist-length"],
			fix: {
				Neckline: ["Sweetheart", "Square"],
				Sleeves: ["Sleeveless", "Detached"],
				Fit: ["Skin-tight", "Fitted"]
			}
		},
		"Tube top": {
			size: ["Micro crop", "Waist-length"],
			fix: {
				Neckline: [
					"Off-shoulder",
					"Sweetheart",
					"Square"
				],
				Sleeves: ["Sleeveless", "Detached"],
				Fit: ["Skin-tight", "Fitted"]
			}
		},
		Halter: { fix: {
			Neckline: ["Halter"],
			Sleeves: ["Sleeveless"]
		} },
		Bodysuit: {
			size: ["Hip-length", "Hip-length"],
			fix: { Fit: ["Skin-tight", "Fitted"] }
		},
		Bralette: {
			size: ["Micro crop", "Micro crop"],
			fix: {
				Sleeves: ["Sleeveless"],
				Neckline: [
					"V-neck",
					"Sweetheart",
					"Halter",
					"Square"
				],
				Fit: ["Skin-tight", "Fitted"]
			}
		},
		"Tank top": { fix: {
			Sleeves: ["Sleeveless"],
			Neckline: [
				"Crew",
				"V-neck",
				"Square",
				"Cowl"
			]
		} },
		Shirt: { fix: {
			Neckline: [
				"V-neck",
				"High neck",
				"Crew"
			],
			Sleeves: [
				"Long",
				"Short",
				"Balloon"
			]
		} },
		Tunic: {
			size: ["Tunic-length", "Oversized"],
			fix: { Fit: [
				"Relaxed",
				"Oversized",
				"Regular"
			] }
		},
		"Peplum top": {
			size: ["Waist-length", "Hip-length"],
			fix: { Fit: ["Fitted", "Skin-tight"] }
		},
		"Sculptural top": { fix: {
			Fit: [
				"Exaggerated",
				"Oversized",
				"Fitted"
			],
			Construction: [
				"Structured",
				"Deconstructed",
				"Layered"
			]
		} }
	},
	bottoms: {
		"Mini skirt": { size: ["Micro", "Mini"] },
		"Midi skirt": { size: ["Knee-length", "Midi"] },
		"Maxi skirt": { size: ["Ankle-length", "Trailing"] },
		"Pencil skirt": {
			size: ["Above-knee", "Midi"],
			fix: { "Fit / Silhouette": [
				"Skinny",
				"Slim",
				"Straight",
				"Tapered"
			] }
		},
		"Pleated skirt": {
			size: ["Micro", "Ankle-length"],
			fix: { Construction: ["Pleated"] }
		},
		Shorts: { size: ["Mini", "Knee-length"] },
		"Hot pants": { size: ["Micro", "Micro"] },
		Trousers: {
			size: ["Ankle-length", "Trailing"],
			fix: { "Fit / Silhouette": [
				"Straight",
				"Slim",
				"Wide-leg",
				"Tapered",
				"Flared"
			] }
		},
		Jeans: {
			size: ["Ankle-length", "Floor-length"],
			fix: { Material: ["Denim"] }
		},
		"Cargo pants": {
			size: ["Ankle-length", "Floor-length"],
			fix: {
				"Fit / Silhouette": [
					"Baggy",
					"Straight",
					"Wide-leg",
					"Tapered"
				],
				Details: [
					"Pockets",
					"Straps",
					"Buckles",
					"Chains"
				]
			}
		},
		Leggings: {
			size: ["Midi", "Ankle-length"],
			fix: {
				"Fit / Silhouette": ["Skinny"],
				Material: [
					"Knit",
					"Latex",
					"Leather",
					"Mesh",
					"Velvet",
					"Metallic fabric",
					"Lace"
				]
			}
		},
		Flares: {
			size: ["Ankle-length", "Trailing"],
			fix: { "Fit / Silhouette": ["Flared", "Bell-bottom"] }
		},
		"Wide-leg pants": {
			size: ["Ankle-length", "Trailing"],
			fix: { "Fit / Silhouette": ["Wide-leg", "Baggy"] }
		},
		"Harem pants": {
			size: ["Midi", "Ankle-length"],
			fix: { "Fit / Silhouette": [
				"Balloon",
				"Baggy",
				"Tapered"
			] }
		},
		Chaps: {
			size: ["Ankle-length", "Floor-length"],
			fix: {
				Material: [
					"Leather",
					"Denim",
					"Latex",
					"Velvet",
					"Metallic fabric"
				],
				"Fit / Silhouette": [
					"Straight",
					"Flared",
					"Slim"
				]
			}
		}
	},
	coats: {
		"Trench coat": {
			size: ["Knee-length", "Floor-length"],
			fix: { Closure: [
				"Double-breasted",
				"Belt",
				"Open-front"
			] }
		},
		Blazer: {
			size: ["Waist-length", "Thigh-length"],
			fix: {
				"Collar / Neck": [
					"Notched lapel",
					"Peak lapel",
					"Shawl collar",
					"Collarless"
				],
				Sleeves: [
					"Fitted",
					"Puff",
					"Oversized",
					"Sleeveless"
				]
			}
		},
		"Pea coat": {
			size: ["Hip-length", "Thigh-length"],
			fix: {
				Closure: ["Double-breasted"],
				Material: [
					"Wool",
					"Velvet",
					"Leather",
					"Denim"
				]
			}
		},
		Overcoat: { size: ["Knee-length", "Floor-length"] },
		Cape: {
			size: ["Waist-length", "Floor-length"],
			fix: { Sleeves: ["Cape sleeves"] }
		},
		Cloak: {
			size: ["Calf-length", "Trailing"],
			fix: {
				Sleeves: ["Cape sleeves"],
				"Collar / Neck": [
					"Hood",
					"Stand collar",
					"Oversized collar",
					"Collarless"
				]
			}
		},
		Puffer: {
			size: ["Cropped", "Knee-length"],
			fix: {
				Structure: ["Quilted", "Padded"],
				Material: [
					"Quilted fabric",
					"Vinyl",
					"Metallic textile",
					"Satin"
				]
			}
		},
		Parka: {
			size: ["Hip-length", "Knee-length"],
			fix: {
				"Collar / Neck": ["Hood", "Funnel neck"],
				Closure: ["Zipper", "Buttons"]
			}
		},
		"Leather jacket": {
			size: ["Cropped", "Hip-length"],
			fix: {
				Material: ["Leather", "Vinyl"],
				Closure: [
					"Zipper",
					"Asymmetrical",
					"Open-front"
				]
			}
		},
		Bomber: {
			size: ["Cropped", "Hip-length"],
			fix: {
				"Collar / Neck": ["Stand collar", "Collarless"],
				Closure: ["Zipper", "Open-front"]
			}
		},
		Bolero: {
			size: ["Cropped", "Cropped"],
			fix: { Closure: ["Open-front", "Hook-and-eye"] }
		},
		Duster: {
			size: ["Calf-length", "Trailing"],
			fix: { Closure: ["Open-front", "Belt"] }
		},
		"Fur coat": { fix: { Material: ["Faux fur"] } },
		"Military coat": { fix: {
			Closure: ["Double-breasted", "Buttons"],
			"Collar / Neck": [
				"Stand collar",
				"Peak lapel",
				"Notched lapel"
			],
			Structure: [
				"Padded",
				"Armored",
				"Layered",
				"Quilted"
			]
		} },
		"Sculptural coat": { fix: {
			Silhouette: [
				"Cocoon",
				"Exaggerated shoulders",
				"Structured",
				"Oversized"
			],
			Structure: [
				"Sculptural",
				"Padded",
				"Armored",
				"Deconstructed"
			]
		} }
	},
	shoes: {
		Stilettos: {
			size: ["No shaft", "No shaft"],
			fix: {
				"Heel Height": ["High", "Extreme"],
				"Sole / Heel Design": [
					"Stiletto",
					"Transparent",
					"Curved"
				]
			}
		},
		Pumps: {
			size: ["No shaft", "No shaft"],
			fix: {
				"Heel Height": [
					"Low",
					"Medium",
					"High"
				],
				"Sole / Heel Design": [
					"Stiletto",
					"Block",
					"Curved"
				]
			}
		},
		"Platform heels": {
			size: ["No shaft", "Ankle"],
			fix: {
				"Heel Height": ["Platform", "Extreme"],
				"Sole / Heel Design": [
					"Platform",
					"Block",
					"Transparent"
				]
			}
		},
		Boots: { size: ["Ankle", "Thigh"] },
		"Ankle boots": { size: ["Ankle", "Ankle"] },
		"Knee-high boots": { size: ["Knee", "Knee"] },
		"Thigh-high boots": { size: ["Over-the-knee", "Thigh"] },
		Sandals: {
			size: ["No shaft", "Ankle"],
			fix: {
				"Toe Shape": [
					"Open toe",
					"Square",
					"Almond"
				],
				Fastening: [
					"Straps",
					"Buckle",
					"Ankle ties",
					"Wraparound"
				]
			}
		},
		Flats: {
			size: ["No shaft", "No shaft"],
			fix: { "Heel Height": ["Flat"] }
		},
		"Ballet flats": {
			size: ["No shaft", "No shaft"],
			fix: {
				"Heel Height": ["Flat"],
				"Toe Shape": [
					"Round",
					"Square",
					"Almond"
				],
				Fastening: [
					"Ribbons",
					"Ankle ties",
					"Slip-on",
					"Straps"
				]
			}
		},
		Loafers: {
			size: ["No shaft", "No shaft"],
			fix: {
				"Heel Height": [
					"Flat",
					"Low",
					"Platform"
				],
				Fastening: ["Slip-on", "Buckle"]
			}
		},
		Sneakers: {
			size: ["No shaft", "Ankle"],
			fix: {
				"Heel Height": ["Flat", "Platform"],
				Fastening: [
					"Lace-up",
					"Zipper",
					"Straps"
				],
				"Toe Shape": ["Round", "Square"]
			}
		},
		"Gladiator sandals": {
			size: ["Ankle", "Thigh"],
			fix: {
				"Toe Shape": ["Open toe"],
				Fastening: [
					"Straps",
					"Lace-up",
					"Wraparound"
				]
			}
		},
		Mules: {
			size: ["No shaft", "No shaft"],
			fix: { Fastening: ["Slip-on"] }
		},
		Wedges: {
			size: ["No shaft", "Ankle"],
			fix: {
				"Sole / Heel Design": ["Wedge", "Platform"],
				"Heel Height": [
					"Medium",
					"High",
					"Platform"
				]
			}
		},
		"Sculptural heels": {
			size: ["No shaft", "Mid-calf"],
			fix: {
				"Sole / Heel Design": [
					"Sculptural",
					"Floating",
					"Curved"
				],
				"Heel Height": ["High", "Extreme"]
			}
		}
	},
	bags: {
		Clutch: {
			size: ["Micro", "Medium"],
			fix: { "Handle / Strap": [
				"No handle",
				"Wristlet",
				"Chain strap"
			] }
		},
		"Shoulder bag": { fix: { "Handle / Strap": ["Shoulder strap", "Chain strap"] } },
		Tote: {
			size: ["Medium", "Giant"],
			fix: {
				"Handle / Strap": [
					"Shoulder strap",
					"Top handle",
					"Multiple straps"
				],
				Shape: [
					"Rectangular",
					"Square",
					"Geometric"
				]
			}
		},
		Crossbody: {
			size: ["Micro", "Medium"],
			fix: { "Handle / Strap": ["Crossbody strap", "Chain strap"] }
		},
		"Mini bag": { size: ["Micro", "Mini"] },
		"Hobo bag": {
			size: ["Small", "Oversized"],
			fix: {
				Structure: ["Slouchy", "Soft"],
				Shape: [
					"Crescent",
					"Organic",
					"Oval"
				],
				"Handle / Strap": ["Shoulder strap", "Chain strap"]
			}
		},
		"Bucket bag": { fix: {
			Shape: [
				"Round",
				"Oval",
				"Spherical",
				"Square"
			],
			"Handle / Strap": [
				"Shoulder strap",
				"Top handle",
				"Crossbody strap"
			]
		} },
		Backpack: {
			size: ["Mini", "Giant"],
			fix: { "Handle / Strap": ["Multiple straps"] }
		},
		Minaudière: {
			size: ["Micro", "Small"],
			fix: {
				Structure: ["Rigid", "Sculptural"],
				Material: [
					"Metal",
					"Acrylic",
					"Beads",
					"Satin"
				],
				"Handle / Strap": [
					"No handle",
					"Chain strap",
					"Wristlet"
				]
			}
		},
		"Top-handle bag": { fix: {
			"Handle / Strap": ["Top handle"],
			Structure: [
				"Structured",
				"Rigid",
				"Quilted"
			]
		} },
		"Belt bag": {
			size: ["Micro", "Small"],
			fix: { "Handle / Strap": ["Multiple straps", "Crossbody strap"] }
		},
		"Sculptural bag": { fix: {
			Structure: ["Sculptural", "Rigid"],
			Shape: [
				"Spherical",
				"Geometric",
				"Organic",
				"Abstract",
				"Animal-shaped",
				"Crescent"
			]
		} }
	},
	jewelry: {
		Earrings: {
			size: ["Micro", "Oversized"],
			fix: { Placement: [
				"Ears",
				"Ears",
				"Face"
			] }
		},
		Bracelet: {
			size: ["Micro", "Large"],
			fix: { Placement: ["Wrists"] }
		},
		Necklace: { fix: { Placement: [
			"Neck",
			"Neck",
			"Shoulders",
			"Full body"
		] } },
		Choker: {
			size: ["Micro", "Large"],
			fix: { Placement: ["Neck"] }
		},
		Ring: {
			size: ["Micro", "Oversized"],
			fix: { Placement: ["Fingers"] }
		},
		Anklet: {
			size: ["Micro", "Large"],
			fix: { Placement: ["Ankles"] }
		},
		"Waist chain": {
			size: ["Small", "Body-length"],
			fix: { Placement: ["Waist", "Full body"] }
		}
	},
	wings: {
		"Feather wings": { fix: { Material: ["Feathers"] } },
		"Angel wings": { fix: {
			Material: [
				"Feathers",
				"Organza",
				"Silk",
				"Crystals"
			],
			Shape: [
				"Rounded",
				"Feathered",
				"Layered",
				"Curved",
				"Tapered"
			]
		} },
		"Butterfly wings": { fix: { Material: [
			"Organza",
			"Tulle",
			"Chiffon",
			"Silk",
			"Iridescent film",
			"Sequins",
			"Acrylic"
		] } },
		"Insect wings": { fix: {
			Material: [
				"Organza",
				"Iridescent film",
				"Acrylic",
				"Wire",
				"Tulle"
			],
			Shape: [
				"Tapered",
				"Pointed",
				"Rounded",
				"Layered",
				"Curved"
			]
		} },
		"Dragon wings": { fix: {
			Material: [
				"Silk",
				"Metal",
				"Wire",
				"Sequins",
				"Iridescent film",
				"Organza"
			],
			Outline: [
				"Spiked",
				"Scalloped",
				"Flame-shaped",
				"Clean"
			]
		} },
		"Bird wings": { fix: { Material: ["Feathers"] } },
		"Crystal wings": { fix: { Material: [
			"Crystals",
			"Acrylic",
			"Iridescent film"
		] } },
		"Metallic wings": { fix: { Material: [
			"Metal",
			"Wire",
			"Sequins"
		] } },
		"Abstract sculptural wings": { fix: {
			Material: [
				"Wire",
				"Acrylic",
				"Metal",
				"Organza",
				"Iridescent film"
			],
			Shape: [
				"Radial",
				"Angular",
				"Asymmetrical",
				"Curved",
				"Fan-shaped"
			]
		} }
	}
};
var wrap = (h) => (Math.round(h) % 360 + 360) % 360;
var clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function hsl$1(c, alpha = 1, dHue = 0) {
	return `hsl(${wrap(c.h + dHue)} ${Math.round(c.s)}% ${Math.round(c.l)}% / ${alpha})`;
}
function hexToHsl(hex) {
	const n = parseInt(hex.slice(1), 16);
	const r = (n >> 16 & 255) / 255;
	const g = (n >> 8 & 255) / 255;
	const b = (n & 255) / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	const d = max - min;
	let h = 0;
	let s = 0;
	if (d) {
		s = d / (1 - Math.abs(2 * l - 1));
		h = max === r ? (g - b) / d % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
	}
	return {
		h: wrap(h * 60),
		s: s * 100,
		l: l * 100
	};
}
function weighted(r, xs, w) {
	const ws = xs.map((x) => Math.max(0, w(x)));
	let t = r.next() * ws.reduce((a, b) => a + b, 0);
	for (let i = 0; i < xs.length; i++) if ((t -= ws[i]) < 0) return xs[i];
	return xs[xs.length - 1];
}
var likes = (p, option) => {
	const o = option.toLowerCase();
	return p.likes.some((l) => o === l || o.includes(l) || l.length > 4 && l.includes(o));
};
function styleWeight(main, inf) {
	return (option) => 1 + (likes(main, option) ? 2.5 : 0) + inf.reduce((a, p) => a + (likes(p, option) ? 1.2 : 0), 0);
}
/** Uniform-ish over a range, with a bonus on the extremes (PRD "Include extreme values"). */
function pickIndex(r, lo, hi, lean = 0) {
	if (hi <= lo) return lo;
	if (r.chance(.18)) return r.chance(.5 + lean * .4) ? hi : lo;
	const v = r.next() + lean * .35 * r.next();
	return clamp(lo + Math.floor(v * (hi - lo + 1)), lo, hi);
}
function jitter(r, c, dh = 8, ds = 8, dl = 6) {
	return {
		h: wrap(c.h + r.int(-dh, dh)),
		s: clamp(c.s + r.int(-ds, ds), 0, 100),
		l: clamp(c.l + r.int(-dl, dl), 6, 96)
	};
}
function towardHue(h, target, t) {
	return wrap(h + ((target - h + 540) % 360 - 180) * t);
}
function applyPalette(r, c, palette) {
	switch (palette) {
		case "Pastel": return {
			h: c.h,
			s: r.int(45, 75),
			l: r.int(78, 88)
		};
		case "Jewel tones": return {
			h: c.h,
			s: r.int(62, 85),
			l: r.int(26, 40)
		};
		case "Earthy": return {
			h: towardHue(c.h, 30, .55),
			s: r.int(25, 45),
			l: r.int(30, 55)
		};
		case "Neon": return {
			h: c.h,
			s: r.int(95, 100),
			l: r.int(54, 62)
		};
		case "Muted": return {
			h: c.h,
			s: r.int(12, 28),
			l: clamp(c.l, 35, 70)
		};
		case "Metallic": return {
			h: c.h,
			s: clamp(c.s * .6, 10, 50),
			l: r.int(55, 75)
		};
		case "Icy": return {
			h: towardHue(c.h, 200, .6),
			s: r.int(30, 60),
			l: r.int(80, 92)
		};
		case "Warm": return {
			h: towardHue(c.h, 20, .45),
			s: clamp(c.s, 50, 90),
			l: c.l
		};
		case "Cool": return {
			h: towardHue(c.h, 230, .45),
			s: clamp(c.s, 40, 85),
			l: c.l
		};
		default: return c;
	}
}
function colorsFor(r, main, inf, palette, relation) {
	const anchors = [
		main.colors[0],
		...main.colors,
		...inf.flatMap((p) => p.colors.slice(0, 2))
	].map(hexToHsl);
	const primary = applyPalette(r, jitter(r, r.pick(anchors)), palette);
	let secondary;
	if (relation === "Complementary") secondary = {
		h: wrap(primary.h + 180 + r.int(-15, 15)),
		s: clamp(primary.s + r.int(-10, 10), 20, 95),
		l: clamp(100 - primary.l + r.int(-8, 8), 18, 90)
	};
	else if (relation === "Tonal" || palette === "Monochrome") secondary = {
		h: wrap(primary.h + r.int(-6, 6)),
		s: primary.s,
		l: clamp(primary.l + (primary.l > 50 ? -22 : 22), 8, 94)
	};
	else {
		const far = anchors.map((a) => ({
			a,
			d: Math.abs((a.h - primary.h + 540) % 360 - 180) * .3 + Math.abs(a.l - primary.l)
		})).sort((x, y) => x.d - y.d).pop().a;
		secondary = applyPalette(r, jitter(r, far), palette === "Signature" ? palette : r.chance(.5) ? palette : "Signature");
	}
	const metal = r.pick([...main.metals, ...inf[0]?.metals.slice(0, 1) ?? []]);
	const accent = r.chance(.45) ? hexToHsl(METALS[metal]) : jitter(r, r.pick(anchors), 20, 10, 10);
	return {
		primary,
		secondary,
		accent,
		metal
	};
}
function patternFor(r, word, main) {
	const fav = main.patterns;
	const favOr = (...xs) => {
		const hit = xs.filter((x) => fav.includes(x));
		return r.pick(hit.length ? hit : xs);
	};
	switch (word) {
		case "Solid":
		case "Primary color":
		case "Secondary color":
		case "Monochrome":
		case "Pastel":
		case "Jewel tones": return r.chance(.3) ? r.pick(fav) : "solid";
		case "Gradient": return "gradient";
		case "Ombré": return "ombre";
		case "Multicolor": return "multicolor";
		case "Color-blocked": return "colorblock";
		case "Holographic": return "holographic";
		case "Iridescent":
		case "Translucent": return "iridescent";
		case "Floral": return favOr("floral", "roses", "tropical");
		case "Animal print": return favOr("animal", "zebra", "snake", "scales");
		case "Stripes":
		case "Striped": return favOr("stripes", "pinstripe");
		case "Plaid": return favOr("plaid", "gingham", "check");
		case "Geometric": return favOr("geometric", "check");
		case "Abstract": return "abstract";
		case "Baroque": return "baroque";
		case "Digital": return "digital";
		case "Embroidered": return "embroidered";
		case "Printed": return r.pick(fav.filter((p) => p !== "solid").length ? fav.filter((p) => p !== "solid") : [
			"polka",
			"stars",
			"hearts",
			"floral"
		]);
		case "Metallic":
		case "Transparent": return "solid";
		default: return r.pick(fav);
	}
}
var PATTERN_PARAM = {
	dresses: "Pattern",
	tops: "Color / Pattern",
	bottoms: "Color / Pattern",
	coats: "Color / Pattern",
	shoes: "Color / Pattern",
	bags: "Color / Pattern",
	jewelry: "",
	wings: "Color"
};
var MOTIF_FOR_SHAPE = {
	Geometric: [
		"gem",
		"star",
		"lightning"
	],
	Floral: [
		"flower",
		"rose",
		"leaf"
	],
	Organic: [
		"leaf",
		"shell",
		"pearl",
		"drop",
		"mushroom"
	],
	Celestial: [
		"star",
		"moon",
		"sparkle"
	],
	Animal: [
		"bat",
		"snake",
		"butterfly",
		"feather"
	],
	Abstract: [
		"wave",
		"drop",
		"lightning",
		"bubble"
	],
	Architectural: [
		"key",
		"crown",
		"cross"
	],
	Tribal: [
		"feather",
		"gem",
		"lightning"
	]
};
var DENSITY_P = {
	Minimal: .15,
	Moderate: .45,
	Ornate: .75,
	Maximalist: .95
};
var WORLD_WORDS = /\b(Mermaid|Fairy|Vampire)\b/g;
function nick(substyle) {
	return substyle.split(" / ")[0].replace(WORLD_WORDS, "").trim() || substyle;
}
var titleCase = (s) => s.replace(/\b([a-z])/g, (m) => m.toUpperCase());
var PATTERN_WORD = {
	floral: "Floral",
	roses: "Rose",
	tropical: "Tropical",
	animal: "Leopard",
	zebra: "Zebra",
	snake: "Snakeskin",
	scales: "Scale",
	stripes: "Striped",
	pinstripe: "Pinstripe",
	plaid: "Tartan",
	gingham: "Gingham",
	check: "Check",
	geometric: "Geo",
	abstract: "Swirl",
	baroque: "Baroque",
	digital: "Pixel",
	polka: "Polka",
	stars: "Starry",
	hearts: "Heart",
	lace: "Lace",
	quilted: "Quilted",
	embroidered: "Embroidered",
	cherries: "Cherry",
	holographic: "Holo",
	iridescent: "Opal",
	ombre: "Ombré",
	gradient: "Fade",
	multicolor: "Prism",
	colorblock: "Block"
};
function makeName(r, substyle, type, spec) {
	const pw = PATTERN_WORD[spec.pattern];
	const middle = pw && r.chance(.55) ? pw : spec.materials[0];
	return titleCase(`${nick(substyle)} ${middle} ${type}`).replace(/\s+/g, " ");
}
/** Category attributes (and size) for a type, biased by style. */
function buildAttrs(r, category, type, baseWeight, universal, keep = {}) {
	const schema = SCHEMA[category];
	const rule = TYPE_RULES[category][type] ?? {};
	const attrs = {};
	const density = universal["Detail density"];
	for (const [key, options] of Object.entries(schema.params)) {
		const allowed = rule.fix?.[key] ?? options;
		const bias = PARAM_BIAS[category]?.[key];
		const weight = bias ? (o) => baseWeight(o) * (bias[o] ?? 1) : baseWeight;
		if (keep[key] && allowed.includes(keep[key])) {
			attrs[key] = keep[key];
			continue;
		}
		if (schema.optional.includes(key) && !rule.fix?.[key]) {
			if (!r.chance(DENSITY_P[density] ?? .4)) {
				attrs[key] = "None";
				continue;
			}
			const n = density === "Maximalist" && r.chance(.6) ? 2 : 1;
			const picks = /* @__PURE__ */ new Set();
			while (picks.size < n) picks.add(weighted(r, allowed, weight));
			attrs[key] = [...picks].join(", ");
			continue;
		}
		attrs[key] = weighted(r, allowed, weight);
	}
	if (category === "wings" && universal.Symmetry !== "Symmetrical" && attrs.Symmetry === "Symmetrical") attrs.Symmetry = universal.Symmetry;
	const idx = (label) => Math.max(0, schema.sizes.indexOf(label));
	const [lo, hi] = rule.size ? [idx(rule.size[0]), idx(rule.size[1])] : [MIN_SIZE[category] ?? 0, schema.sizes.length - 1];
	return {
		attrs,
		size: pickIndex(r, lo, hi, [
			"Subtle",
			"Standard",
			"Exaggerated",
			"Extreme couture"
		].indexOf(universal.Exaggeration) / 3 - .3)
	};
}
function buildUniversal(r, world, main, weight) {
	const U = UNIVERSAL;
	const intensity = weighted(r, U["Style intensity"], (x) => ({
		Subtle: 2,
		Recognizable: 3,
		Dramatic: 2,
		Maximalist: 1.2,
		Editorial: 1
	})[x]);
	const base = {
		Subtle: 0,
		Recognizable: 1,
		Dramatic: 2,
		Maximalist: 3,
		Editorial: 1
	}[intensity];
	const exBase = {
		Subtle: 0,
		Recognizable: 1,
		Dramatic: 2,
		Maximalist: 2,
		Editorial: 3
	}[intensity];
	const at = (xs, i) => xs[clamp(i, 0, xs.length - 1)];
	const fantasy = world !== "normal";
	return {
		"Color palette": r.chance(.55) ? "Signature" : r.pick(U["Color palette"].slice(1)),
		"Color relation": weighted(r, U["Color relation"], (x) => x === "Contrasting" ? 1.4 : 1),
		Finish: weighted(r, U.Finish, (x) => weight(x) * (x === "Translucent" ? .5 : 1)),
		"Material mix": weighted(r, U["Material mix"], (x) => ({
			"Single material": 3,
			"Two materials": 2,
			"Mixed materials": 1
		})[x]),
		"Pattern scale": r.pick(U["Pattern scale"]),
		"Detail density": at(U["Detail density"], base + r.int(-1, 1)),
		Symmetry: weighted(r, U.Symmetry, (x) => ({
			Symmetrical: 7.5,
			Asymmetrical: 1.8,
			Mismatched: .7
		})[x]),
		"Shape language": weighted(r, U["Shape language"], weight),
		Era: r.chance(.6) ? r.pick(main.eras) : r.pick(U.Era),
		"World style": r.chance(.7) ? r.pick(main.worldStyle) : r.pick(U["World style"]),
		Exaggeration: at(U.Exaggeration, exBase + r.int(-1, 1)),
		Layering: weighted(r, U.Layering, (x) => ({
			None: 3,
			Light: 3,
			Moderate: 2,
			Heavy: 1,
			Cascading: .8
		})[x]),
		Transparency: weighted(r, U.Transparency, (x) => ({
			Opaque: 6,
			Sheer: 1.5,
			Translucent: 1,
			Transparent: .5,
			Mixed: 1.2
		})[x] * weight(x)),
		Wearability: weighted(r, U.Wearability, (x) => ({
			Everyday: fantasy ? 1 : 4,
			Editorial: 2,
			Runway: 1.5,
			"Fantasy costume": fantasy ? 2.5 : .4
		})[x]),
		"Style intensity": intensity
	};
}
function pickMaterials(r, category, main, mix, weight) {
	const opts = SCHEMA[category].params.Material ?? [];
	const n = mix === "Mixed materials" ? 3 : mix === "Two materials" ? 2 : 1;
	const out = [main];
	for (let i = 0; i < 12 && out.length < n; i++) {
		const m = weighted(r, opts, weight);
		if (!out.includes(m)) out.push(m);
	}
	return out;
}
/** Derives treatment overrides implied by a category's "Color" word (e.g. Iridescent → finish). */
function applyColorWord(word, universal) {
	if (word === "Iridescent") universal.Finish = "Iridescent";
	if (word === "Metallic") universal.Finish = "Metallic";
	if (word === "Transparent" || word === "Translucent") universal.Transparency = "Translucent";
}
function generateItem(r, world, idSeed, category, substyle, forceType) {
	category ??= r.pick(CATEGORIES);
	const schema = SCHEMA[category];
	const main = substyle ? profile(substyle) : r.pick(SUBSTYLES[world]);
	const nInf = weighted(r, [
		0,
		1,
		2
	], (x) => [
		6,
		3,
		1
	][x]);
	const influences = [];
	for (let i = 0; i < nInf; i++) {
		const from = r.chance(.5) ? world : r.chance(.7) ? "normal" : r.pick(WORLD_IDS);
		const p = r.pick(SUBSTYLES[from]);
		if (p !== main && !influences.includes(p)) influences.push(p);
	}
	const weight = styleWeight(main, influences);
	const type = forceType ?? weighted(r, schema.types, weight);
	const universal = buildUniversal(r, world, main, weight);
	const { attrs, size } = buildAttrs(r, category, type, weight, universal);
	const colorWord = attrs[PATTERN_PARAM[category]] ?? attrs.Color ?? "Solid";
	if (category === "dresses") applyColorWord(attrs.Color, universal);
	applyColorWord(colorWord, universal);
	if (attrs.Material === "Chrome" || attrs.Material === "Metal") universal.Finish = "Metallic";
	if (attrs.Material === "Transparent PVC") universal.Transparency = "Transparent";
	const { primary, secondary, accent, metal } = colorsFor(r, main, influences, category === "wings" && attrs.Color === "Pastel" ? "Pastel" : category === "wings" && attrs.Color === "Jewel tones" ? "Jewel tones" : universal["Color palette"], universal["Color relation"]);
	let pattern = category === "dresses" ? ["Gradient", "Multicolor"].includes(attrs.Color) ? patternFor(r, attrs.Color, main) : patternFor(r, attrs.Pattern, main) : category === "jewelry" ? "solid" : patternFor(r, colorWord, main);
	if (category === "coats" && attrs.Structure === "Quilted" && pattern === "solid") pattern = "quilted";
	const shapeMotifs = MOTIF_FOR_SHAPE[attrs["Shape / Motif"] ?? ""] ?? [];
	const motifPool = [
		...main.motifs,
		...main.motifs,
		...shapeMotifs,
		...shapeMotifs,
		...influences.flatMap((p) => p.motifs.slice(0, 1))
	];
	const motif = motifPool.length ? r.pick(motifPool) : r.pick(MOTIFS);
	const spec = {
		v: 2,
		secondary,
		accent,
		metal,
		pattern,
		motif,
		materials: pickMaterials(r, category, attrs.Material ?? attrs["Feather Style"] ?? "Fabric", universal["Material mix"], weight),
		influences: influences.map((p) => p.name),
		universal,
		attrs,
		signature: r.pick(SIGNATURES[category])
	};
	const item = {
		id: `itm_${hashString(idSeed).toString(36)}`,
		name: makeName(r, main.name, type, spec),
		category,
		world,
		substyle: main.name,
		type,
		size,
		hue: primary.h,
		baseHue: primary.h,
		sat: Math.round(primary.s),
		light: Math.round(primary.l),
		finish: universal.Finish,
		params: {},
		spec,
		createdAt: Date.now()
	};
	item.params = flatParams(item, spec);
	return item;
}
function flatParams(it, spec) {
	return {
		...spec.attrs,
		...spec.universal,
		Materials: spec.materials.join(", "),
		Pattern: spec.pattern,
		Motif: spec.motif,
		Metal: spec.metal,
		"Signature feature": spec.signature,
		Influences: spec.influences.join(", ") || "None",
		[SCHEMA[it.category].sizeLabel]: SCHEMA[it.category].sizes[it.size] ?? ""
	};
}
/**
* The renderer's view of an item. Items saved before the full schema existed get a
* deterministic spec derived from their id, so their art never changes between loads.
*/
var legacyCache = /* @__PURE__ */ new Map();
function specOf(it) {
	if (it.spec?.v === 2) return it.spec;
	const key = `${it.id}|${it.category}|${it.type}`;
	let s = legacyCache.get(key);
	if (!s) {
		const fresh = generateItem(rng(hashString(key)), it.world, key, it.category, it.substyle);
		s = {
			...fresh.spec,
			attrs: buildAttrs(rng(hashString(key + "a")), it.category, it.type, () => 1, fresh.spec.universal).attrs
		};
		legacyCache.set(key, s);
	}
	return s;
}
/** Base share of each category across a 6-hour window. Wings are statement pieces: rarer. */
var CATEGORY_WEIGHT = {
	dresses: 1.25,
	tops: 1.15,
	bottoms: 1.15,
	coats: 1,
	shoes: 1,
	bags: .9,
	jewelry: 1,
	wings: .55
};
/** Hard cap per window, across all five worlds. */
var WINDOW_CAP = { wings: 2 };
/** Which world a category prefers to show up in (flavor, not a lock). */
var WORLD_AFFINITY = {
	mermaid: {
		jewelry: 1.6,
		dresses: 1.3,
		tops: 1.2,
		coats: .7,
		wings: .8
	},
	fairy: {
		wings: 2.6,
		dresses: 1.3,
		shoes: 1.1
	},
	vampire: {
		coats: 1.5,
		dresses: 1.3,
		jewelry: 1.3,
		wings: .9
	},
	hogwarts: {
		coats: 1.6,
		bottoms: 1.3,
		tops: 1.2,
		wings: .4
	},
	normal: {
		bags: 1.6,
		shoes: 1.4,
		tops: 1.2,
		wings: .35
	}
};
/**
* Deals categories for one 6-hour window across ALL worlds at once, so the window as a whole
* has a balanced mix (largest-remainder apportionment), and each world gets distinct
* categories (never two of the same kind in one run unless impossible). Deterministic per seed.
*/
function dealWindow(seed) {
	const r = rng(hashString(`${seed}|deal`));
	const counts = Object.fromEntries(WORLD_IDS.map((w) => [w, r.int(3, 5)]));
	const total = Object.values(counts).reduce((a, b) => a + b, 0);
	const sumW = CATEGORIES.reduce((a, c) => a + CATEGORY_WEIGHT[c], 0);
	const raw = CATEGORIES.map((c) => ({
		c,
		q: total * CATEGORY_WEIGHT[c] / sumW
	}));
	const quota = new Map(raw.map(({ c, q }) => [c, Math.min(Math.floor(q), WINDOW_CAP[c] ?? 99)]));
	let left = total - [...quota.values()].reduce((a, b) => a + b, 0);
	const byRemainder = raw.map(({ c, q }) => ({
		c,
		rem: q - Math.floor(q) + r.next() * .3
	})).sort((a, b) => b.rem - a.rem);
	for (let i = 0; left > 0; i = (i + 1) % byRemainder.length) {
		const { c } = byRemainder[i];
		if (quota.get(c) < (WINDOW_CAP[c] ?? 99)) {
			quota.set(c, quota.get(c) + 1);
			left--;
		}
	}
	const deck = CATEGORIES.flatMap((c) => Array(quota.get(c)).fill(c));
	deck.sort((a, b) => quota.get(b) - quota.get(a) || r.next() - .5);
	const hands = Object.fromEntries(WORLD_IDS.map((w) => [w, []]));
	for (const c of deck) {
		const open = WORLD_IDS.filter((w) => hands[w].length < counts[w]);
		const fresh = open.filter((w) => !hands[w].includes(c));
		hands[weighted(r, fresh.length ? fresh : open, (w) => (WORLD_AFFINITY[w][c] ?? 1) * ((counts[w] - hands[w].length) / counts[w] + .25))].push(c);
	}
	for (const a of WORLD_IDS) for (let i = 0; i < hands[a].length; i++) {
		const c = hands[a][i];
		if (hands[a].indexOf(c) === i) continue;
		swap: for (const b of WORLD_IDS) {
			if (b === a || hands[b].includes(c)) continue;
			for (let j = 0; j < hands[b].length; j++) {
				const d = hands[b][j];
				if (!hands[a].includes(d)) {
					hands[a][i] = d;
					hands[b][j] = c;
					break swap;
				}
			}
		}
	}
	for (const w of WORLD_IDS) {
		const h = hands[w];
		for (let i = h.length - 1; i > 0; i--) {
			const j = r.int(0, i);
			[h[i], h[j]] = [h[j], h[i]];
		}
	}
	return hands;
}
/** All items for one world run: balanced categories and a distinct substyle per item. */
function generateRunItems(user, world, seedKey) {
	const cats = dealWindow(`${user}|${seedKey}`)[world];
	const seed = `${user}|${world}|${seedKey}`;
	const r = rng(hashString(`${seed}|items`));
	const styles = [...SUBSTYLES[world]];
	for (let i = styles.length - 1; i > 0; i--) {
		const j = r.int(0, i);
		[styles[i], styles[j]] = [styles[j], styles[i]];
	}
	return cats.map((c, i) => generateItem(r, world, `${seed}|${i}`, c, styles[i % styles.length].name));
}
//#endregion
//#region app/lib/sync.ts
var SHEETS_URL = "https://script.google.com/macros/s/AKfycbyRjWxkNteYwgYCz74SPyi0iY5h_OjSLM5S_lZXy-C6NzB7lK003Z-D8wOO1w9bZTg-/exec";
var TOKEN_KEY = "bvs:token";
var syncEnabled = Boolean(SHEETS_URL);
function getToken() {
	try {
		return localStorage.getItem(TOKEN_KEY);
	} catch {
		return null;
	}
}
async function call(action, payload) {
	const res = await fetch(SHEETS_URL, {
		method: "POST",
		headers: { "Content-Type": "text/plain;charset=utf-8" },
		body: JSON.stringify({
			action,
			...payload
		})
	});
	if (!res.ok) throw new Error(`Sheets ${action} failed: ${res.status}`);
	const body = await res.json();
	if (body.error) throw new Error(`Sheets ${action}: ${body.error}`);
	return body;
}
var pending;
/** Debounced so rapid edits (typing, tapping) produce one write. */
function saveRemote(user, state) {
	if (!syncEnabled) return;
	clearTimeout(pending);
	pending = setTimeout(() => {
		call("save", {
			user,
			token: getToken(),
			state
		}).catch((e) => console.warn(e));
	}, 1500);
}
//#endregion
//#region app/lib/store.ts
var USERS = ["Bernice", "Shelby"];
var hueHex = (h, s, l) => {
	const a = s / 100 * Math.min(l / 100, 1 - l / 100);
	const f = (n) => {
		const k = (n + h / 30) % 12;
		const c = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
		return Math.round(c * 255).toString(16).padStart(2, "0");
	};
	return `#${f(0)}${f(8)}${f(4)}`;
};
/** Hair / eye colour as hex, falling back to the legacy hue sliders. */
var hairHex = (a) => a.hairColor ?? hueHex(a.hairHue, 58, 52);
var eyeHex = (a) => a.eyeColor ?? hueHex(a.eyeHue, 75, 45);
var blankTodo = (i) => ({
	text: "",
	locked: false,
	done: false,
	world: WORLD_IDS[i % WORLD_IDS.length],
	repeat: false
});
function freshState() {
	return {
		version: 1,
		todoDate: pstDate(),
		todos: Array.from({ length: 5 }, (_, i) => blankTodo(i)),
		currency: Object.fromEntries(WORLD_IDS.map((w) => [w, 0])),
		closet: [],
		worn: {},
		mannequins: Array.from({ length: 3 }, () => ({})),
		avatar: {
			body: "hourglass",
			backHair: "long",
			bangs: "blunt",
			bangLength: "medium",
			hairHue: 280,
			eyeHue: 200,
			hairColor: "#a347d1",
			eyeColor: "#1f7fd1",
			hairTexture: "straight"
		},
		entryTs: Date.now(),
		runs: {}
	};
}
/** Daily (PST) reset: repeating tasks come back unchecked, the rest clear. */
function rollDay(s) {
	const today = pstDate();
	if (s.todoDate === today) return;
	s.todoDate = today;
	s.todos = s.todos.map((t, i) => t.repeat ? {
		...t,
		done: false
	} : {
		...blankTodo(i),
		world: t.world
	});
}
/** The time-entered seed only moves forward once 6 hours have passed. */
function rollEntry(s) {
	const now = Date.now();
	if (now - s.entryTs >= 216e5) s.entryTs = now;
}
var SESSION_KEY = "bvs:session";
var stateKey = (u) => `bvs:user:${u}`;
function readLocal(u) {
	try {
		const raw = localStorage.getItem(stateKey(u));
		if (raw) return JSON.parse(raw);
	} catch {}
	return freshState();
}
function writeLocal(u, s) {
	try {
		localStorage.setItem(stateKey(u), JSON.stringify(s));
	} catch {}
}
var session = null;
var state = null;
var listeners$1 = /* @__PURE__ */ new Set();
var emit = () => listeners$1.forEach((l) => l());
function getSession() {
	if (session) return session;
	try {
		const s = localStorage.getItem(SESSION_KEY);
		if (s && USERS.includes(s)) session = s;
	} catch {}
	return session;
}
/** Loads the session user's state, applying daily / 6-hour rollovers. */
function ensureState() {
	const u = getSession();
	if (!u) return null;
	if (!state) state = readLocal(u);
	const draft = structuredClone(state);
	rollDay(draft);
	rollEntry(draft);
	if (draft.todoDate !== state.todoDate || draft.entryTs !== state.entryTs) {
		state = draft;
		writeLocal(u, draft);
		emit();
	}
	return state;
}
var seedKeyFor = (s) => `${pstDate()}|${s.entryTs}`;
/** Copy-on-write update; persists locally and queues a Sheets sync. */
function update(fn) {
	const u = getSession();
	if (!u || !state) return;
	const draft = structuredClone(state);
	fn(draft);
	draft.updatedAt = Date.now();
	state = draft;
	writeLocal(u, draft);
	saveRemote(u, draft);
	emit();
}
var subscribe = (l) => {
	listeners$1.add(l);
	return () => listeners$1.delete(l);
};
function useGame() {
	return useSyncExternalStore(subscribe, () => state, () => null) ?? freshState();
}
var actions = {
	setTodoText(i, text) {
		update((s) => {
			s.todos[i].text = text;
		});
	},
	lockTodo(i) {
		update((s) => {
			const t = s.todos[i];
			if (t.text.trim()) t.locked = true;
		});
	},
	unlockTodo(i) {
		update((s) => {
			if (!s.todos[i].done) s.todos[i].locked = false;
		});
	},
	cycleTodoWorld(i) {
		update((s) => {
			const t = s.todos[i];
			if (t.done) return;
			t.world = WORLD_IDS[(WORLD_IDS.indexOf(t.world) + 1) % WORLD_IDS.length];
		});
	},
	toggleRepeat(i) {
		if (i >= 3) return;
		update((s) => {
			s.todos[i].repeat = !s.todos[i].repeat;
		});
	},
	completeTodo(i) {
		update((s) => {
			const t = s.todos[i];
			if (!t.locked || t.done) return;
			t.done = true;
			s.currency[t.world] += 1;
		});
	},
	/**
	* Enter a world. A run is fixed for its seed (PST date + 6h entry window),
	* so re-entering can't reroll items. Starting a new run costs 1 currency;
	* returning to the current run is free.
	* Returns false if the player can't afford a new run.
	*/
	enterWorld(world, user) {
		const s = ensureState();
		if (!s) return false;
		const seedKey = seedKeyFor(s);
		if (s.runs[world]?.seedKey === seedKey) return true;
		if (s.currency[world] < 1) return false;
		update((d) => {
			d.currency[world] -= 1;
			d.runs[world] = generateRun(user, world, seedKey);
		});
		return true;
	},
	tapSpot(world, spot) {
		update((s) => {
			const sp = s.runs[world]?.spots[spot];
			if (sp) sp.taps += 1;
		});
	},
	collect(world, itemIndex) {
		update((s) => {
			const run = s.runs[world];
			const it = run?.items[itemIndex];
			if (!run || !it || run.collected.includes(it.id)) return;
			run.collected.push(it.id);
			s.closet.push({
				...it,
				createdAt: Date.now()
			});
		});
	},
	wear(itemId) {
		update((s) => {
			const it = s.closet.find((c) => c.id === itemId);
			if (!it) return;
			s.worn[it.category] = s.worn[it.category] === itemId ? void 0 : itemId;
		});
	},
	setAvatar(patch) {
		update((s) => {
			Object.assign(s.avatar, patch);
		});
	},
	saveToMannequin(m) {
		update((s) => {
			s.mannequins[m] = { ...s.worn };
		});
	},
	clearMannequin(m) {
		update((s) => {
			s.mannequins[m] = {};
		});
	},
	addMannequin() {
		update((s) => {
			s.mannequins.push({});
		});
	},
	/** Saves an upcycle over the original. `consumedId` (combine's second item) is used up. */
	replaceItem(next, consumedId) {
		update((s) => {
			if (consumedId && consumedId !== next.id) {
				s.closet = s.closet.filter((c) => c.id !== consumedId);
				for (const outfit of [s.worn, ...s.mannequins]) for (const c of CATEGORIES) if (outfit[c] === consumedId) outfit[c] = void 0;
			}
			const i = s.closet.findIndex((c) => c.id === next.id);
			if (i < 0) return;
			const prevCategory = s.closet[i].category;
			s.closet[i] = next;
			if (prevCategory !== next.category && s.worn[prevCategory] === next.id) {
				s.worn[prevCategory] = void 0;
				s.worn[next.category] = next.id;
			}
		});
	}
};
function generateRun(user, world, seedKey) {
	const r = rng(hashString(`${user}|${world}|${seedKey}`));
	const def = WORLDS[world];
	const items = generateRunItems(user, world, seedKey);
	const itemCount = items.length;
	const spotCount = itemCount + r.int(1, 2);
	const assignment = [...items.map((_, i) => i), ...Array(spotCount - itemCount).fill(null)];
	for (let i = assignment.length - 1; i > 0; i--) {
		const j = r.int(0, i);
		[assignment[i], assignment[j]] = [assignment[j], assignment[i]];
	}
	const zoneY = {
		sky: [12, 26],
		mid: [38, 55],
		floor: [68, 80]
	};
	const spots = assignment.map((item, i) => {
		const inter = i < def.interactions.length ? def.interactions[i] : r.pick(def.interactions);
		const [y0, y1] = zoneY[inter.zone];
		const x = 6 + (i + .5) / spotCount * 88 + r.int(-3, 3);
		return {
			kind: inter.kind,
			zone: inter.zone,
			x,
			y: r.int(y0, y1),
			item,
			taps: 0
		};
	});
	for (let i = spots.length - 1; i > 0; i--) {
		const j = r.int(0, i);
		[spots[i].kind, spots[j].kind] = [spots[j].kind, spots[i].kind];
		[spots[i].zone, spots[j].zone] = [spots[j].zone, spots[i].zone];
		[spots[i].y, spots[j].y] = [spots[j].y, spots[i].y];
	}
	return {
		seedKey,
		spots,
		items,
		collected: []
	};
}
function wornItems(s, outfit = s.worn) {
	return CATEGORIES.flatMap((c) => {
		const id = outfit[c];
		const it = id ? s.closet.find((x) => x.id === id) : void 0;
		return it ? [it] : [];
	});
}
//#endregion
//#region app/lib/tune.ts
var params = [];
var hooks = [];
var listeners = /* @__PURE__ */ new Set();
var version = 0;
var STORE = "bvs:tune";
/** Registers a recompute hook for values derived from tunable geometry. Runs immediately too. */
function onTune(fn) {
	hooks.push(fn);
	fn();
}
function param(group, label, obj, key, min, max, step = .1) {
	params.push({
		id: `${group} / ${label}`,
		group,
		label,
		obj,
		key,
		min,
		max,
		step,
		def: obj[key]
	});
}
var allParams = () => params;
function persist() {
	try {
		const out = {};
		for (const p of params) if (p.obj[p.key] !== p.def) out[p.id] = p.obj[p.key];
		localStorage.setItem(STORE, JSON.stringify(out));
	} catch {}
}
/** Re-runs every derived-value hook (used when switching which body type's measurements are active). */
function runHooks() {
	for (const h of hooks) h();
}
function refresh() {
	for (const h of hooks) h();
	version++;
	listeners.forEach((l) => l());
}
function setParam(p, v) {
	p.obj[p.key] = v;
	refresh();
	persist();
}
function resetAll() {
	for (const p of params) p.obj[p.key] = p.def;
	refresh();
	persist();
}
/** Applies values saved on this device (call once, after all params are registered). */
function loadSaved() {
	try {
		const saved = JSON.parse(localStorage.getItem(STORE) ?? "{}");
		for (const p of params) if (typeof saved[p.id] === "number") p.obj[p.key] = saved[p.id];
	} catch {}
	refresh();
}
/** The changed values, ready to paste back to Claude. */
function exportChanged() {
	const out = {};
	for (const p of params) {
		const v = p.obj[p.key];
		if (v !== p.def) (out[p.group] ??= {})[p.label] = Math.round(v * 100) / 100;
	}
	return JSON.stringify(out, null, 2);
}
/** Re-render on any tuning change. */
function useTuneVersion() {
	return useSyncExternalStore((l) => {
		listeners.add(l);
		return () => listeners.delete(l);
	}, () => version, () => 0);
}
/**
* Landmark heights (y). Garments position themselves from these. The head/face rows are shared;
* the body rows (shoulder → ankle) are the *active* body type's, copied in by applyBody().
*/
var Y = {
	crown: 31,
	eyes: 65.7,
	chin: 89.8,
	neck: 94.6,
	shoulder: 103.5,
	bust: 131.5,
	underbust: 149.5,
	waist: 165.5,
	highHip: 187.5,
	hip: 202.5,
	crotch: 210,
	thigh: 261,
	knee: 282.5,
	calf: 334.5,
	ankle: 376,
	floor: 392
};
/** Head ellipse (face) — used by the doll, earrings, hoods, halos. */
var HEAD = {
	cx: 100,
	cy: 60.4,
	rx: 21.9,
	ry: 29.4
};
/** Foot scale (relative to the base foot drawing): bigger feet, mostly longer. */
var FOOT = {
	sx: 1.8,
	sy: .72
};
/** Face feature placement/size (offsets from the defaults the face was drawn at). */
var FACE = {
	eyeDX: 11.4,
	eyeScale: 1.1,
	eyeOpen: 1,
	eyeY: 0,
	irisR: 3.3,
	browLift: -.2,
	browWeight: 1,
	lidWeight: 1.35,
	lowerLid: 1,
	noseY: -.8,
	noseShadow: 2.1,
	mouthY: -2,
	mouthW: 2.8,
	cheekW: -2.1,
	cheekY: 8.1,
	jaw: 9.9,
	chinTip: 1.4,
	shadowX: 0,
	blush: .34,
	earY: 4.6
};
/** Hair lengths (absolute y) and width. */
var HAIR = {
	shortEnd: 78,
	bobEnd: 93,
	mediumEnd: 148,
	longEnd: 242,
	bangShort: 48,
	bangMedium: 54,
	bangLong: 61,
	lockBob: 90,
	lockMedium: 118,
	lockLong: 140,
	width: 0,
	volume: 0
};
/** Arm/hand thickness, arm joint heights, leg thickness — the active body type's (see applyBody). */
var LIMB = {
	armBase: 5.8,
	armTaper: .5,
	hand: 1.8,
	elbowY: 178,
	wristY: 220,
	legThick: .6
};
/** Body landmark heights per body type. */
var HEIGHTS = {
	long: {
		shoulder: 103.5,
		bust: 131.5,
		underbust: 149.5,
		waist: 165.5,
		highHip: 182,
		hip: 198.5,
		crotch: 210.5,
		thigh: 258,
		knee: 289,
		calf: 341,
		ankle: 378.5
	},
	hourglass: {
		shoulder: 103.5,
		bust: 131.5,
		underbust: 149.5,
		waist: 165.5,
		highHip: 187.5,
		hip: 202.5,
		crotch: 210,
		thigh: 261,
		knee: 282.5,
		calf: 334.5,
		ankle: 376
	},
	pear: {
		shoulder: 103,
		bust: 131.5,
		underbust: 149.5,
		waist: 165.5,
		highHip: 191.5,
		hip: 212,
		crotch: 210,
		thigh: 266.5,
		knee: 282.5,
		calf: 334,
		ankle: 376
	}
};
/** Arms, hands and legs per body type. */
var LIMBS = {
	long: {
		armBase: 5.3,
		armTaper: .5,
		hand: 1.8,
		elbowY: 168,
		wristY: 220,
		legThick: .6
	},
	hourglass: {
		armBase: 5.8,
		armTaper: .5,
		hand: 1.8,
		elbowY: 178,
		wristY: 220,
		legThick: .6
	},
	pear: {
		armBase: 5.8,
		armTaper: .5,
		hand: 1.8,
		elbowY: 171,
		wristY: 220,
		legThick: .6
	}
};
/** Feet per body type. */
var FEET = {
	long: {
		sx: 1.8,
		sy: .72
	},
	hourglass: {
		sx: 1.8,
		sy: .72
	},
	pear: {
		sx: 1.8,
		sy: .72
	}
};
/**
* Makes `type` the active body: copies its heights/limbs/feet into Y, LIMB and FOOT and recomputes
* everything derived from them (hem heights, arm joints…). Called at the start of every doll and
* garment render, so dolls of different body types can share a screen.
*/
function applyBody(type) {
	Object.assign(Y, HEIGHTS[type]);
	Object.assign(LIMB, LIMBS[type]);
	Object.assign(FOOT, FEET[type]);
	runHooks();
}
/** Extra leg half-thickness at height y (eases in just below the crotch so the hips stay smooth). */
var legExtra = (y) => LIMB.legThick * Math.max(0, Math.min(1, (y - Y.crotch) / 12));
onTune(() => {
	Y.crown = HEAD.cy - HEAD.ry;
	Y.chin = HEAD.cy + HEAD.ry;
});
/** Each body type's measurements, set independently. */
var BODIES = {
	long: {
		type: "long",
		neck: 5.4,
		shoulder: 33,
		bust: 26.8,
		underbust: 20.9,
		waist: 19.2,
		highHip: 23.1,
		hip: 27.3,
		legOuter: {
			thigh: 23.4,
			knee: 20,
			calf: 15.4,
			ankle: 10.9
		},
		legInner: {
			crotch: 1,
			thigh: 3.9,
			knee: 5.8,
			calf: 4.4,
			ankle: 6.6
		},
		elbow: 37,
		wrist: 47
	},
	hourglass: {
		type: "hourglass",
		neck: 5.4,
		shoulder: 33,
		bust: 26.8,
		underbust: 20.9,
		waist: 17.6,
		highHip: 27.8,
		hip: 33.4,
		legOuter: {
			thigh: 24.8,
			knee: 21,
			calf: 16.3,
			ankle: 10.9
		},
		legInner: {
			crotch: 1,
			thigh: 5,
			knee: 5.8,
			calf: 3.3,
			ankle: 6
		},
		elbow: 37,
		wrist: 47
	},
	pear: {
		type: "pear",
		neck: 5.4,
		shoulder: 25.7,
		bust: 26.8,
		underbust: 20.9,
		waist: 17.6,
		highHip: 33.1,
		hip: 35.9,
		legOuter: {
			thigh: 24.8,
			knee: 21,
			calf: 16.3,
			ankle: 10.9
		},
		legInner: {
			crotch: 1,
			thigh: 5,
			knee: 4.6,
			calf: 3.3,
			ankle: 7.1
		},
		elbow: 34.2,
		wrist: 47
	}
};
var lerp = (a, b, t) => a + (b - a) * t;
/**
* Monotone cubic (Fritsch–Carlson) interpolation through (y, w) stops: smooth like a pencil
* contour, no ripples between landmarks, and it never overshoots a landmark width.
*/
function through(stops, y) {
	const n = stops.length;
	if (y <= stops[0][0]) return stops[0][1];
	if (y >= stops[n - 1][0]) return stops[n - 1][1];
	const sec = (i) => (stops[i + 1][1] - stops[i][1]) / (stops[i + 1][0] - stops[i][0]);
	const tan = (i) => {
		if (i === 0) return sec(0);
		if (i === n - 1) return sec(n - 2);
		const a = sec(i - 1);
		const b = sec(i);
		return a * b <= 0 ? 0 : 2 * a * b / (a + b);
	};
	let i = 0;
	while (y > stops[i + 1][0]) i++;
	const [y0, w0] = stops[i];
	const [y1, w1] = stops[i + 1];
	const h = y1 - y0;
	const t = (y - y0) / h;
	const t2 = t * t;
	const t3 = t2 * t;
	return (2 * t3 - 3 * t2 + 1) * w0 + (t3 - 2 * t2 + t) * h * tan(i) + (-2 * t3 + 3 * t2) * w1 + (t3 - t2) * h * tan(i + 1);
}
/** Half-width of the torso (or of both legs together below the crotch) at height y. */
function torsoHalf(b, y) {
	return through([
		[Y.shoulder, b.shoulder],
		[Y.bust, b.bust],
		[Y.underbust, b.underbust],
		[Y.waist, b.waist],
		[Y.highHip, b.highHip],
		[Y.hip, b.hip],
		[Y.thigh, b.legOuter.thigh],
		[Y.knee, b.legOuter.knee],
		[Y.calf, b.legOuter.calf],
		[Y.ankle, b.legOuter.ankle]
	], y) + legExtra(y);
}
/** Inner edge of a leg (distance from center) at height y; 0 above the crotch. */
function legInnerAt(b, y) {
	if (y <= Y.crotch) return 0;
	const inner = through([
		[Y.crotch, b.legInner.crotch],
		[Y.thigh, b.legInner.thigh],
		[Y.knee, b.legInner.knee],
		[Y.calf, b.legInner.calf],
		[Y.ankle, b.legInner.ankle]
	], y);
	return Math.max(.3, inner - legExtra(y));
}
/** Elbow and wrist heights: CLAMP arms are long — elbow at the waist, wrist at the crotch. */
var ARM_Y = {
	elbow: LIMB.elbowY,
	wrist: LIMB.wristY
};
onTune(() => {
	ARM_Y.elbow = LIMB.elbowY;
	ARM_Y.wrist = LIMB.wristY;
});
/** A point along the arm. t: 0 = shoulder, 0.5 = elbow, 1 = wrist. */
function armAt(b, side, t) {
	const s = {
		x: 100 + side * (b.shoulder - 2.5),
		y: Y.shoulder + 2
	};
	const e = {
		x: 100 + side * b.elbow,
		y: ARM_Y.elbow
	};
	const w = {
		x: 100 + side * b.wrist,
		y: ARM_Y.wrist
	};
	if (t <= .5) {
		const u = t / .5;
		return {
			x: lerp(s.x, e.x, u),
			y: lerp(s.y, e.y, u)
		};
	}
	const u = (t - .5) / .5;
	return {
		x: lerp(e.x, w.x, u),
		y: lerp(e.y, w.y, u)
	};
}
/** Unit normal pointing outward from the arm at t (for building sleeve outlines). */
function armNormal(b, side, t) {
	const a = armAt(b, side, Math.max(0, t - .02));
	const c = armAt(b, side, Math.min(1, t + .02));
	const dx = c.x - a.x;
	const dy = c.y - a.y;
	const len = Math.hypot(dx, dy) || 1;
	const n = {
		x: -dy / len,
		y: dx / len
	};
	return n.x * side < 0 ? {
		x: -n.x,
		y: -n.y
	} : n;
}
/** Arm half-width (skin) at t — slim CLAMP limbs, a touch fuller. */
var armHalf = (t) => LIMB.armBase - LIMB.armTaper * t + (t < .12 ? (.12 - t) * 10 : 0);
/**
* Hem/length heights by name, relative to landmarks, so every garment length lands
* on the same anatomy across body types and survives proportion changes.
*/
var computeLen = () => ({
	microCrop: Y.underbust - 6,
	cropped: Y.underbust + 10,
	waist: Y.waist + 4,
	hip: Y.hip + 2,
	tunic: Y.crotch + 22,
	micro: Y.crotch + 8,
	mini: Y.crotch + 22,
	aboveKnee: Y.knee - 22,
	knee: Y.knee,
	midi: Y.knee + 30,
	ankle: Y.ankle + 2,
	floor: Y.floor + 1,
	train: Y.floor + 4
});
var LEN = computeLen();
onTune(() => Object.assign(LEN, computeLen()));
//#endregion
//#region app/lib/tuneDefs.ts
/**
* TEMPORARY: every adjustable doll measurement, as sliders on the "Me" screen.
* Delete this file (and the tuning panel / onTune hooks) once the values are baked in.
*/
param("Head", "head height on body (cy)", HEAD, "cy", 40, 80);
param("Head", "head width (rx)", HEAD, "rx", 14, 28);
param("Head", "head length (ry)", HEAD, "ry", 20, 36);
param("Head", "neck base", Y, "neck", 80, 100);
param("Face", "eyes up/down", Y, "eyes", 48, 78);
param("Face", "cheekbone width", FACE, "cheekW", -5, 3);
param("Face", "cheekbone height", FACE, "cheekY", -4, 12);
param("Face", "jaw curve", FACE, "jaw", 0, 14);
param("Face", "chin tip width", FACE, "chinTip", 0, 5);
param("Face", "nose up/down", FACE, "noseY", -6, 6);
param("Face", "nose shadow width", FACE, "noseShadow", 0, 4);
param("Face", "mouth up/down", FACE, "mouthY", -6, 6);
param("Face", "mouth width", FACE, "mouthW", 1, 5);
param("Face", "ears up/down", FACE, "earY", -4, 10);
param("Face", "face shadow position", FACE, "shadowX", -8, 10);
param("Face", "blush", FACE, "blush", 0, .7, .01);
param("Eyes", "eye spacing", FACE, "eyeDX", 6, 16);
param("Eyes", "eye size", FACE, "eyeScale", .7, 1.6, .01);
param("Eyes", "eye openness", FACE, "eyeOpen", .5, 1.6, .01);
param("Eyes", "eyes nudge up/down", FACE, "eyeY", -4, 4);
param("Eyes", "iris size", FACE, "irisR", 2, 4.8, .05);
param("Eyes", "upper lid weight", FACE, "lidWeight", .4, 2, .05);
param("Eyes", "lower lash line thickness", FACE, "lowerLid", 0, 3, .05);
param("Eyes", "brow height", FACE, "browLift", -3, 5);
param("Eyes", "brow thickness", FACE, "browWeight", .1, 1.4, .05);
param("Hair", "hair width", HAIR, "width", -4, 10);
param("Hair", "hair volume on top", HAIR, "volume", -3, 10);
param("Hair", "short length", HAIR, "shortEnd", 60, 110, 1);
param("Hair", "bob length", HAIR, "bobEnd", 80, 130, 1);
param("Hair", "medium length", HAIR, "mediumEnd", 110, 220, 1);
param("Hair", "long length", HAIR, "longEnd", 180, 330, 1);
param("Hair", "side locks (bob)", HAIR, "lockBob", 70, 120, 1);
param("Hair", "side locks (medium)", HAIR, "lockMedium", 90, 180, 1);
param("Hair", "side locks (long)", HAIR, "lockLong", 100, 240, 1);
param("Hair", "short bangs end", HAIR, "bangShort", 36, 70, .5);
param("Hair", "medium bangs end", HAIR, "bangMedium", 40, 74, .5);
param("Hair", "long bangs end", HAIR, "bangLong", 44, 80, .5);
for (const type of [
	"long",
	"hourglass",
	"pear"
]) {
	const h = HEIGHTS[type];
	for (const [k, label, min, max] of [
		[
			"shoulder",
			"shoulders",
			90,
			115
		],
		[
			"bust",
			"bust",
			110,
			145
		],
		[
			"underbust",
			"underbust",
			125,
			160
		],
		[
			"waist",
			"waist",
			145,
			190
		],
		[
			"highHip",
			"high hip",
			170,
			210
		],
		[
			"hip",
			"hip",
			190,
			235
		],
		[
			"crotch",
			"crotch",
			200,
			250
		],
		[
			"thigh",
			"mid-thigh",
			225,
			275
		],
		[
			"knee",
			"knee",
			270,
			320
		],
		[
			"calf",
			"calf",
			300,
			350
		],
		[
			"ankle",
			"ankle",
			355,
			385
		]
	]) param(`Heights · ${type}`, label, h, k, min, max, .5);
}
for (const type of [
	"long",
	"hourglass",
	"pear"
]) {
	const b = BODIES[type];
	const g = `Widths · ${type}`;
	for (const [k, label, min, max] of [
		[
			"neck",
			"neck",
			3,
			9
		],
		[
			"shoulder",
			"shoulders",
			18,
			40
		],
		[
			"bust",
			"bust",
			14,
			38
		],
		[
			"underbust",
			"underbust",
			12,
			30
		],
		[
			"waist",
			"waist",
			11,
			26
		],
		[
			"highHip",
			"high hip",
			14,
			40
		],
		[
			"hip",
			"hip",
			18,
			50
		],
		[
			"elbow",
			"elbows out",
			24,
			50
		],
		[
			"wrist",
			"wrists out",
			30,
			64
		]
	]) param(g, label, b, k, min, max);
	const o = BODIES[type].legOuter;
	const i = BODIES[type].legInner;
	param(g, "thigh (outer)", o, "thigh", 14, 40);
	param(g, "knee (outer)", o, "knee", 9, 26);
	param(g, "calf (outer)", o, "calf", 9, 26);
	param(g, "ankle (outer)", o, "ankle", 6, 16);
	param(g, "thigh gap", i, "thigh", 0, 8);
	param(g, "knee gap", i, "knee", 0, 10);
	param(g, "calf gap", i, "calf", 0, 10);
	param(g, "ankle gap", i, "ankle", 0, 10);
}
for (const type of [
	"long",
	"hourglass",
	"pear"
]) {
	const l = LIMBS[type];
	const f = FEET[type];
	const g = `Arms & feet · ${type}`;
	param(g, "arm thickness", l, "armBase", 2.5, 7);
	param(g, "leg thickness", l, "legThick", -4, 6);
	param(g, "arm taper to wrist", l, "armTaper", 0, 3);
	param(g, "hand size", l, "hand", .7, 2.2, .01);
	param(g, "elbow height", l, "elbowY", 140, 200, .5);
	param(g, "wrist height", l, "wristY", 190, 260, .5);
	param(g, "foot length", f, "sx", .7, 2.2, .01);
	param(g, "foot height", f, "sy", .5, 1.5, .01);
}
loadSaved();
//#endregion
//#region app/lib/assets.ts
var ASSETS = {
	"world.mermaid.icon": {
		label: "Mermaid",
		glyph: "🧜‍♀️"
	},
	"world.fairy.icon": {
		label: "Fairy",
		glyph: "🧚"
	},
	"world.vampire.icon": {
		label: "Vampire",
		glyph: "🦇"
	},
	"world.hogwarts.icon": {
		label: "Hogwarts",
		glyph: "🐍"
	},
	"world.normal.icon": {
		label: "Normal",
		glyph: "🛍️"
	},
	"currency.mermaid": {
		label: "Pearl",
		glyph: "🦪"
	},
	"currency.fairy": {
		label: "Acorn",
		glyph: "🌰"
	},
	"currency.vampire": {
		label: "Blood drop",
		glyph: "🩸"
	},
	"currency.hogwarts": {
		label: "Galleon",
		glyph: "🪙"
	},
	"currency.normal": {
		label: "Credit card",
		glyph: "💳"
	},
	"interaction.mermaid.seashell": {
		label: "Seashell",
		glyph: "🐚"
	},
	"interaction.mermaid.starfish": {
		label: "Starfish",
		glyph: "⭐"
	},
	"interaction.mermaid.bubble": {
		label: "Bubble",
		glyph: "🫧"
	},
	"interaction.mermaid.jellyfish": {
		label: "Jellyfish",
		glyph: "🪼"
	},
	"interaction.mermaid.manta": {
		label: "Manta ray",
		glyph: "🐟"
	},
	"interaction.fairy.flower": {
		label: "Flower bud",
		glyph: "🌷"
	},
	"interaction.fairy.mushroom-ring": {
		label: "Mushroom ring",
		glyph: "🍄"
	},
	"interaction.fairy.berry": {
		label: "Berry",
		glyph: "🍓"
	},
	"interaction.fairy.leaves": {
		label: "Leaves",
		glyph: "🌿"
	},
	"interaction.fairy.spider": {
		label: "Spider web",
		glyph: "🕸️"
	},
	"interaction.vampire.moon": {
		label: "Crescent moon",
		glyph: "🌙"
	},
	"interaction.vampire.book": {
		label: "Old book",
		glyph: "📖"
	},
	"interaction.vampire.trees": {
		label: "Forest trees",
		glyph: "🌲"
	},
	"interaction.vampire.apple": {
		label: "Apple",
		glyph: "🍎"
	},
	"interaction.vampire.deer": {
		label: "Deer",
		glyph: "🦌"
	},
	"interaction.hogwarts.wand": {
		label: "Wand",
		glyph: "🪄"
	},
	"interaction.hogwarts.portrait": {
		label: "Portrait door",
		glyph: "🖼️"
	},
	"interaction.hogwarts.squid": {
		label: "Giant squid",
		glyph: "🦑"
	},
	"interaction.hogwarts.map": {
		label: "Map",
		glyph: "🗺️"
	},
	"interaction.hogwarts.wand-duel": {
		label: "Light beam",
		glyph: "✨"
	},
	"interaction.normal.bed": {
		label: "Messy bed",
		glyph: "🛏️"
	},
	"interaction.normal.rack": {
		label: "Clothing rack",
		glyph: "🧥"
	},
	"interaction.normal.present": {
		label: "Box present",
		glyph: "🎁"
	},
	"interaction.normal.window": {
		label: "Shop window",
		glyph: "🪟"
	},
	"interaction.normal.ad": {
		label: "Shopping ad window",
		glyph: "🖥️"
	},
	"category.jewelry": {
		label: "Jewelry",
		glyph: "💍"
	},
	"category.dresses": {
		label: "Dress",
		glyph: "👗"
	},
	"category.tops": {
		label: "Top",
		glyph: "👚"
	},
	"category.bottoms": {
		label: "Bottoms",
		glyph: "👖"
	},
	"category.coats": {
		label: "Coat",
		glyph: "🧥"
	},
	"category.shoes": {
		label: "Shoes",
		glyph: "👠"
	},
	"category.bags": {
		label: "Bag",
		glyph: "👜"
	},
	"category.wings": {
		label: "Wings",
		glyph: "🪽"
	},
	"ui.settings": {
		label: "Settings",
		glyph: "⚙️"
	},
	"ui.closet": {
		label: "Closet",
		glyph: "🚪"
	},
	"ui.display": {
		label: "Display",
		glyph: "🧍‍♀️"
	},
	"ui.dressup": {
		label: "Dress up",
		glyph: "🪞"
	},
	"ui.repeat": {
		label: "Repeats daily",
		glyph: "🔁"
	},
	"ui.empty": {
		label: "Nothing here",
		glyph: "💨"
	}
};
function asset(key) {
	return ASSETS[key] ?? {
		label: key,
		glyph: "❔"
	};
}
//#endregion
//#region app/components/garments/kit.tsx
/**
* Shared drawing kit for procedural garment art, in a CLAMP colour-illustration style:
* fine warm ink lines, marker/watercolour washes that pool darker at the edges,
* fine parallel hatching in shadow, soft white sheen and sparkle dots.
*
* Labeling: every drawn piece is wrapped in <g data-art="<category>.<part>.<option>">.
* The art sheet (/art) lists every label; a hand-drawn replacement can target the same key.
*/
var INK = "#2b1b33";
var pt = (x, y, c) => ({
	x,
	y,
	c
});
var f = (n) => +n.toFixed(1);
/**
* Smooth closed (or open) path through points (Catmull-Rom → cubic Bézier).
* Points flagged `c` become sharp corners.
*/
function curve(pts, closed = true, tension = .5) {
	if (pts.length < 2) return "";
	const n = pts.length;
	const get = (i) => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
	let d = `M${f(pts[0].x)} ${f(pts[0].y)}`;
	const segs = closed ? n : n - 1;
	for (let i = 0; i < segs; i++) {
		const p0 = get(i - 1);
		const p1 = get(i);
		const p2 = get(i + 1);
		const p3 = get(i + 2);
		const k = tension / 3;
		const c1 = p1.c ? p1 : {
			x: p1.x + (p2.x - p0.x) * k,
			y: p1.y + (p2.y - p0.y) * k
		};
		const c2 = p2.c ? p2 : {
			x: p2.x - (p3.x - p1.x) * k,
			y: p2.y - (p3.y - p1.y) * k
		};
		d += ` C${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(p2.x)} ${f(p2.y)}`;
	}
	return closed ? d + " Z" : d;
}
/** A tube along the arm from t0 to t1. `w(t)` is the half-width. */
function armTube(b, side, t0, t1, w, steps = 10) {
	const outer = [];
	const inner = [];
	for (let i = 0; i <= steps; i++) {
		const t = t0 + (t1 - t0) * i / steps;
		const p = armAt(b, side, Math.min(1, t));
		if (t > 1) {
			const q = armAt(b, side, .98);
			const k = (t - 1) / .02;
			p.x += (p.x - q.x) * k;
			p.y += (p.y - q.y) * k;
		}
		const n = armNormal(b, side, Math.min(1, t));
		const ww = w(t);
		outer.push(pt(p.x + n.x * ww, p.y + n.y * ww));
		inner.push(pt(p.x - n.x * ww, p.y - n.y * ww));
	}
	return curve([...outer, ...inner.reverse()]);
}
/** Labeled art group. */
function Art({ k, children, ...rest }) {
	return /* @__PURE__ */ jsx("g", {
		"data-art": k,
		...rest,
		children
	});
}
/**
* A filled garment piece in the house style:
* fabric → finish sheen → marker edge-pooling → hatched shadow → fine ink line.
*/
function Fab({ p, d, k, fill, alpha, stroke = INK, sw = .75, finish = true, wash = true, mask }) {
	const a = alpha ?? p.alpha;
	const cid = wash ? p.seq() : "";
	return /* @__PURE__ */ jsxs("g", {
		"data-art": k,
		mask,
		children: [
			/* @__PURE__ */ jsx("path", {
				d,
				fill: fill ?? p.fabric,
				fillOpacity: a
			}),
			finish && p.finish && /* @__PURE__ */ jsx("path", {
				d,
				fill: p.finish,
				opacity: Math.min(1, a + .15)
			}),
			wash && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("clipPath", {
				id: cid,
				children: /* @__PURE__ */ jsx("path", { d })
			}), /* @__PURE__ */ jsxs("g", {
				clipPath: `url(#${cid})`,
				children: [/* @__PURE__ */ jsx("path", {
					d,
					fill: "none",
					stroke: p.pool,
					strokeWidth: 5,
					opacity: .3 * a,
					filter: `url(#${p.uid}-soft)`
				}), /* @__PURE__ */ jsx("path", {
					d,
					fill: `url(#${p.uid}-hatch)`,
					mask: `url(#${p.uid}-shade)`,
					opacity: a
				})]
			})] }),
			/* @__PURE__ */ jsx("path", {
				d,
				fill: "none",
				stroke,
				strokeWidth: sw,
				strokeLinejoin: "round",
				strokeLinecap: "round"
			})
		]
	});
}
/** Thin decorative line (seams, pleats, folds), clipped by the caller if needed. */
function Line({ d, w = .5, o = .5, c = INK, dash }) {
	return /* @__PURE__ */ jsx("path", {
		d,
		fill: "none",
		stroke: c,
		strokeWidth: w,
		opacity: o,
		strokeLinecap: "round",
		strokeDasharray: dash
	});
}
/**
* Fluffy edge trick: a fat round-capped dotted stroke along a path.
* Used for fur, feathers, tulle, marabou and pearls.
*/
function Fluff({ d, c, w = 4, gap = 4, o = 1 }) {
	return /* @__PURE__ */ jsxs("g", {
		opacity: o,
		children: [/* @__PURE__ */ jsx("path", {
			d,
			fill: "none",
			stroke: INK,
			strokeWidth: w + .9,
			strokeDasharray: `0 ${gap}`,
			strokeLinecap: "round"
		}), /* @__PURE__ */ jsx("path", {
			d,
			fill: "none",
			stroke: c,
			strokeWidth: w,
			strokeDasharray: `0 ${gap}`,
			strokeLinecap: "round"
		})]
	});
}
/** Chain: alternating links along a path. */
function Chain({ d, c, w = 1.1 }) {
	return /* @__PURE__ */ jsxs("g", {
		"data-art": "trim.chain",
		children: [/* @__PURE__ */ jsx("path", {
			d,
			fill: "none",
			stroke: INK,
			strokeWidth: w + .8,
			strokeDasharray: "1.8 0.9",
			strokeLinecap: "round"
		}), /* @__PURE__ */ jsx("path", {
			d,
			fill: "none",
			stroke: c,
			strokeWidth: w,
			strokeDasharray: "1.8 0.9",
			strokeLinecap: "round"
		})]
	});
}
/** Four-point anime sparkle. */
function Sparkle({ x, y, s = 4, c = "#fff", glow }) {
	const d = `M${x} ${y - s}Q${x + s * .16} ${y - s * .16} ${x + s} ${y}Q${x + s * .16} ${y + s * .16} ${x} ${y + s}Q${x - s * .16} ${y + s * .16} ${x - s} ${y}Q${x - s * .16} ${y - s * .16} ${x} ${y - s}Z`;
	return /* @__PURE__ */ jsx("path", {
		"data-art": "trim.sparkle",
		d,
		fill: c,
		stroke: INK,
		strokeWidth: .3,
		filter: glow
	});
}
/** Bead / pearl / rhinestone dot. */
function Bead({ x, y, r = 1.3, c }) {
	return /* @__PURE__ */ jsxs("g", {
		"data-art": "trim.bead",
		children: [/* @__PURE__ */ jsx("circle", {
			cx: x,
			cy: y,
			r,
			fill: c,
			stroke: INK,
			strokeWidth: .35
		}), /* @__PURE__ */ jsx("circle", {
			cx: x - r * .35,
			cy: y - r * .35,
			r: r * .35,
			fill: "#fff",
			opacity: .9
		})]
	});
}
/** Points along a sampled polyline (even spacing by arc length). */
function along(pts, n) {
	if (pts.length < 2 || n < 1) return [];
	const lens = [0];
	for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
	const total = lens[lens.length - 1];
	const out = [];
	for (let k = 0; k < n; k++) {
		const target = total * (k + .5) / n;
		let i = 1;
		while (i < lens.length - 1 && lens[i] < target) i++;
		const t = (target - lens[i - 1]) / (lens[i] - lens[i - 1] || 1);
		out.push({
			x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t,
			y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t
		});
	}
	return out;
}
var attr = (spec, key) => spec.attrs[key] ?? "";
/** Index of a value in an ordered list, for turning words into numbers. */
var level = (xs, v) => Math.max(0, xs.indexOf(v));
/** Normalizes a label word to a slug (handles accents like Minaudière). */
var slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
//#endregion
//#region app/components/garments/motifs.tsx
var S = {
	stroke: INK,
	strokeWidth: 1,
	strokeLinejoin: "round",
	strokeLinecap: "round"
};
var MOTIF_ART = {
	star: (c) => /* @__PURE__ */ jsx("path", {
		...S,
		fill: c,
		d: "M0-10L2.9-3.4 9.8-3.1 4.4 1.4 6.2 8.4 0 4.5-6.2 8.4-4.4 1.4-9.8-3.1-2.9-3.4Z"
	}),
	sparkle: (c) => /* @__PURE__ */ jsx("path", {
		...S,
		fill: c,
		d: "M0-10Q1.2-1.2 10 0Q1.2 1.2 0 10Q-1.2 1.2-10 0Q-1.2-1.2 0-10Z"
	}),
	moon: (c) => /* @__PURE__ */ jsx("path", {
		...S,
		fill: c,
		d: "M2-9.5A9.5 9.5 0 1 0 8 5.5A7.2 7.2 0 1 1 2-9.5Z"
	}),
	heart: (c) => /* @__PURE__ */ jsx("path", {
		...S,
		fill: c,
		d: "M0 8.5C-9 2.5-10.5-3.5-6.5-7C-3.5-9.5 0-7.5 0-4.5C0-7.5 3.5-9.5 6.5-7C10.5-3.5 9 2.5 0 8.5Z"
	}),
	flower: (c, a) => /* @__PURE__ */ jsxs("g", {
		...S,
		children: [[
			0,
			72,
			144,
			216,
			288
		].map((r) => /* @__PURE__ */ jsx("ellipse", {
			cx: 0,
			cy: -5.5,
			rx: 4,
			ry: 5,
			fill: c,
			transform: `rotate(${r})`
		}, r)), /* @__PURE__ */ jsx("circle", {
			r: 3,
			fill: a
		})]
	}),
	rose: (c, a) => /* @__PURE__ */ jsxs("g", {
		...S,
		children: [
			/* @__PURE__ */ jsx("circle", {
				r: 8.5,
				fill: c
			}),
			/* @__PURE__ */ jsx("path", {
				fill: "none",
				d: "M0-1.5A1.8 1.8 0 1 1-1.8 1A3.6 3.6 0 1 1 3.4-2A5.6 5.6 0 1 1-5.6 1.5"
			}),
			/* @__PURE__ */ jsx("path", {
				fill: a,
				d: "M-6 7C-9 10-4 11-2 8.5M6 7C9 10 4 11 2 8.5"
			})
		]
	}),
	leaf: (c) => /* @__PURE__ */ jsxs("g", {
		...S,
		children: [/* @__PURE__ */ jsx("path", {
			fill: c,
			d: "M0-10C7.5-5 7.5 4 0 10C-7.5 4-7.5-5 0-10Z"
		}), /* @__PURE__ */ jsx("path", {
			fill: "none",
			d: "M0-8V10M0-2L3.5-5M0 3L-3.5 0M0 6L3 3.5"
		})]
	}),
	shell: (c) => /* @__PURE__ */ jsxs("g", {
		...S,
		children: [
			/* @__PURE__ */ jsx("path", {
				fill: c,
				d: "M0 9L-9.5-1C-9-8.5 9-8.5 9.5-1Z"
			}),
			/* @__PURE__ */ jsx("path", {
				fill: "none",
				d: "M0 9L-5.5-6.5M0 9L0-8M0 9L5.5-6.5M0 9L-8.5-3M0 9L8.5-3"
			}),
			/* @__PURE__ */ jsx("path", {
				fill: c,
				d: "M-3 9H3V10.5H-3Z"
			})
		]
	}),
	pearl: () => /* @__PURE__ */ jsxs("g", { children: [
		/* @__PURE__ */ jsx("circle", {
			r: 7.5,
			fill: "#fbf6ee",
			...S
		}),
		/* @__PURE__ */ jsx("circle", {
			cx: -2.5,
			cy: -2.5,
			r: 2.5,
			fill: "#fff"
		}),
		/* @__PURE__ */ jsx("circle", {
			cx: 2,
			cy: 3,
			r: 3,
			fill: "#e9dcf2",
			opacity: .6
		})
	] }),
	wave: (c) => /* @__PURE__ */ jsx("path", {
		...S,
		fill: c,
		d: "M-10 6C-10-3-3-9 4-7C9-5.5 9 0 4 0C1 0 1-3 3-3.5C-1-4-4 1-2 5C0 8 6 8 10 6Z"
	}),
	bubble: (c) => /* @__PURE__ */ jsxs("g", { children: [/* @__PURE__ */ jsx("circle", {
		r: 8,
		fill: c,
		fillOpacity: .35,
		...S
	}), /* @__PURE__ */ jsx("path", {
		d: "M-4.5-2.5A5 5 0 0 1-1-5.5",
		stroke: "#fff",
		strokeWidth: 1.6,
		fill: "none",
		strokeLinecap: "round"
	})] }),
	bow: (c, a) => /* @__PURE__ */ jsxs("g", {
		...S,
		children: [
			/* @__PURE__ */ jsx("path", {
				fill: c,
				d: "M-1 3L-5 10L-2 9.5L0 4M1 3L5 10L2 9.5L0 4"
			}),
			/* @__PURE__ */ jsx("path", {
				fill: c,
				d: "M0 0C-3-6-10-7-10-1C-10 5-3 4 0 0C3 4 10 5 10-1C10-7 3-6 0 0Z"
			}),
			/* @__PURE__ */ jsx("ellipse", {
				rx: 2.2,
				ry: 2.6,
				fill: a
			})
		]
	}),
	bat: (c) => /* @__PURE__ */ jsx("path", {
		...S,
		fill: c,
		d: "M0-2.5C-1-5-2-5.5-2.5-4.5C-4-6.5-7-6.5-10.5-4C-8.5-2.5-8-0.5-8.5 2C-6.5 0.5-4.5 1-3.5 3.5C-2 1.5-1 1.5 0 3C1 1.5 2 1.5 3.5 3.5C4.5 1 6.5 0.5 8.5 2C8-0.5 8.5-2.5 10.5-4C7-6.5 4-6.5 2.5-4.5C2-5.5 1-5 0-2.5Z"
	}),
	snake: (c, a) => /* @__PURE__ */ jsxs("g", { children: [
		/* @__PURE__ */ jsx("path", {
			d: "M-8 9C-10 3-2 2 0 1C5-1 8-4 5-8C3-10-1-9-2-7",
			fill: "none",
			stroke: INK,
			strokeWidth: 4.6,
			strokeLinecap: "round"
		}),
		/* @__PURE__ */ jsx("path", {
			d: "M-8 9C-10 3-2 2 0 1C5-1 8-4 5-8C3-10-1-9-2-7",
			fill: "none",
			stroke: c,
			strokeWidth: 3,
			strokeLinecap: "round"
		}),
		/* @__PURE__ */ jsx("circle", {
			cx: -2.5,
			cy: -7.2,
			r: 2.4,
			fill: c,
			...S
		}),
		/* @__PURE__ */ jsx("circle", {
			cx: -3,
			cy: -7.6,
			r: .6,
			fill: a
		})
	] }),
	butterfly: (c, a) => /* @__PURE__ */ jsxs("g", {
		...S,
		children: [
			/* @__PURE__ */ jsx("path", {
				fill: c,
				d: "M0-1C-3-8-10-10-10-4C-10 0-5 1 0 0C-5 1-9 4-7 8C-5 10-1 6 0 1Z"
			}),
			/* @__PURE__ */ jsx("path", {
				fill: c,
				d: "M0-1C3-8 10-10 10-4C10 0 5 1 0 0C5 1 9 4 7 8C5 10 1 6 0 1Z"
			}),
			/* @__PURE__ */ jsx("circle", {
				cx: -6,
				cy: -4,
				r: 1.5,
				fill: a
			}),
			/* @__PURE__ */ jsx("circle", {
				cx: 6,
				cy: -4,
				r: 1.5,
				fill: a
			}),
			/* @__PURE__ */ jsx("path", {
				fill: "none",
				d: "M0-4V5M0-4L-2-8M0-4L2-8"
			})
		]
	}),
	mushroom: (c) => /* @__PURE__ */ jsxs("g", {
		...S,
		children: [
			/* @__PURE__ */ jsx("path", {
				fill: "#f7ead2",
				d: "M-3 0H3L3.5 9H-3.5Z"
			}),
			/* @__PURE__ */ jsx("path", {
				fill: c,
				d: "M-10 1C-10-7 10-7 10 1Z"
			}),
			/* @__PURE__ */ jsx("circle", {
				cx: -4.5,
				cy: -2.5,
				r: 1.4,
				fill: "#fff"
			}),
			/* @__PURE__ */ jsx("circle", {
				cx: 2,
				cy: -4.5,
				r: 1.2,
				fill: "#fff"
			}),
			/* @__PURE__ */ jsx("circle", {
				cx: 5.5,
				cy: -1,
				r: 1,
				fill: "#fff"
			})
		]
	}),
	crown: (c, a) => /* @__PURE__ */ jsxs("g", {
		...S,
		children: [
			/* @__PURE__ */ jsx("path", {
				fill: c,
				d: "M-9 6L-10-5-4.5 0 0-8 4.5 0 10-5 9 6Z"
			}),
			/* @__PURE__ */ jsx("circle", {
				cx: 0,
				cy: 1.5,
				r: 1.8,
				fill: a
			}),
			/* @__PURE__ */ jsx("path", {
				fill: "none",
				d: "M-9 3.5H9"
			})
		]
	}),
	cross: (c) => /* @__PURE__ */ jsx("path", {
		...S,
		fill: c,
		d: "M-2-10H2V-4.5H7.5V-1H2V10H-2V-1H-7.5V-4.5H-2Z"
	}),
	drop: (c) => /* @__PURE__ */ jsxs("g", { children: [/* @__PURE__ */ jsx("path", {
		...S,
		fill: c,
		d: "M0-10C4-3.5 7 0.5 7 4A7 7 0 0 1-7 4C-7 0.5-4-3.5 0-10Z"
	}), /* @__PURE__ */ jsx("path", {
		d: "M-3.5 3A3.5 3.5 0 0 0-1 6.5",
		stroke: "#fff",
		strokeWidth: 1.2,
		fill: "none",
		strokeLinecap: "round"
	})] }),
	gem: (c) => /* @__PURE__ */ jsxs("g", {
		...S,
		children: [
			/* @__PURE__ */ jsx("path", {
				fill: c,
				d: "M-9-3L-5-8.5H5L9-3 0 9.5Z"
			}),
			/* @__PURE__ */ jsx("path", {
				fill: "none",
				d: "M-9-3H9M-5-8.5L-2.5-3 0 9.5 2.5-3 5-8.5",
				opacity: .7
			}),
			/* @__PURE__ */ jsx("path", {
				d: "M-3-7L-1-4",
				stroke: "#fff",
				strokeWidth: 1.2
			})
		]
	}),
	key: (c) => /* @__PURE__ */ jsxs("g", {
		...S,
		fill: c,
		children: [
			/* @__PURE__ */ jsx("circle", {
				cy: -5.5,
				r: 4
			}),
			/* @__PURE__ */ jsx("circle", {
				cy: -5.5,
				r: 1.5,
				fill: "#fff"
			}),
			/* @__PURE__ */ jsx("path", { d: "M-1-1.5H1V9.5H-1Z" }),
			/* @__PURE__ */ jsx("path", { d: "M1 5H4.5V7H1M1 8H3.5V9.5H1" })
		]
	}),
	cherry: (c) => /* @__PURE__ */ jsxs("g", {
		...S,
		children: [
			/* @__PURE__ */ jsx("path", {
				fill: "none",
				d: "M-4 3C-3-4 1-8 5-9M4 4C4-3 4-6 5-9"
			}),
			/* @__PURE__ */ jsx("path", {
				fill: "#5fae4a",
				d: "M5-9C8-10 10-8 9-6C7-6 5-7 5-9Z"
			}),
			/* @__PURE__ */ jsx("circle", {
				cx: -4,
				cy: 5,
				r: 4,
				fill: c
			}),
			/* @__PURE__ */ jsx("circle", {
				cx: 4.5,
				cy: 5.5,
				r: 4,
				fill: c
			}),
			/* @__PURE__ */ jsx("circle", {
				cx: -5.4,
				cy: 3.6,
				r: 1,
				fill: "#fff"
			})
		]
	}),
	potion: (c, a) => /* @__PURE__ */ jsxs("g", {
		...S,
		children: [
			/* @__PURE__ */ jsx("path", {
				fill: "#e8f4ff",
				fillOpacity: .7,
				d: "M-2.5-8H2.5V-4C7-2 8.5 1.5 8.5 4A8.5 6 0 0 1-8.5 4C-8.5 1.5-7-2-2.5-4Z"
			}),
			/* @__PURE__ */ jsx("path", {
				fill: c,
				d: "M-8 4.5C-6 2.5 6 2.5 8 4.5A8 5.5 0 0 1-8 4.5Z"
			}),
			/* @__PURE__ */ jsx("path", {
				fill: a,
				d: "M-3-10.5H3V-8H-3Z"
			}),
			/* @__PURE__ */ jsx("circle", {
				cx: -2,
				cy: 6,
				r: 1,
				fill: "#fff"
			})
		]
	}),
	web: (c) => /* @__PURE__ */ jsxs("g", {
		...S,
		fill: "none",
		stroke: c === "#fff" ? INK : c,
		strokeWidth: .8,
		children: [
			[
				0,
				45,
				90,
				135
			].map((r) => /* @__PURE__ */ jsx("path", {
				d: "M0-10V10",
				transform: `rotate(${r})`
			}, r)),
			/* @__PURE__ */ jsx("path", { d: "M0-3.5L2.5-2.5 3.5 0 2.5 2.5 0 3.5-2.5 2.5-3.5 0-2.5-2.5Z" }),
			/* @__PURE__ */ jsx("path", { d: "M0-7L5-5 7 0 5 5 0 7-5 5-7 0-5-5Z" })
		]
	}),
	feather: (c) => /* @__PURE__ */ jsxs("g", {
		...S,
		children: [/* @__PURE__ */ jsx("path", {
			fill: c,
			d: "M0-10C6-5 6 3 0 9C-6 3-6-5 0-10Z"
		}), /* @__PURE__ */ jsx("path", {
			fill: "none",
			d: "M0-8V11M0-4L3-6.5M0 0L3.5-2.5M0-2L-3.5-4.5M0 2.5L-3 0.5M0 5L3 3"
		})]
	}),
	lightning: (c) => /* @__PURE__ */ jsx("path", {
		...S,
		fill: c,
		d: "M2.5-10L-6.5 1.5H-0.5L-3 10 6.5-2H0.5Z"
	}),
	apple: (c) => /* @__PURE__ */ jsxs("g", {
		...S,
		children: [
			/* @__PURE__ */ jsx("path", {
				fill: c,
				d: "M0-4C-3-6.5-9-6-9 1C-9 7-4 10 0 8C4 10 9 7 9 1C9-6 3-6.5 0-4Z"
			}),
			/* @__PURE__ */ jsx("path", {
				fill: "none",
				d: "M0-4C0-7 1-9 2.5-10"
			}),
			/* @__PURE__ */ jsx("path", {
				fill: "#5fae4a",
				d: "M1-7C3-10 7-9 7-7C5-6 3-6 1-7Z"
			}),
			/* @__PURE__ */ jsx("path", {
				d: "M-5-1A3 3 0 0 1-3-3.5",
				stroke: "#fff",
				strokeWidth: 1.2,
				fill: "none"
			})
		]
	}),
	snowflake: (c) => /* @__PURE__ */ jsxs("g", {
		stroke: INK,
		strokeWidth: 2.6,
		strokeLinecap: "round",
		children: [[
			0,
			60,
			120
		].map((r) => /* @__PURE__ */ jsx("path", {
			d: "M0-9V9M-3-7L0-4 3-7M-3 7L0 4 3 7",
			transform: `rotate(${r})`,
			fill: "none"
		}, r)), /* @__PURE__ */ jsx("g", {
			stroke: c,
			strokeWidth: 1.3,
			children: [
				0,
				60,
				120
			].map((r) => /* @__PURE__ */ jsx("path", {
				d: "M0-9V9M-3-7L0-4 3-7M-3 7L0 4 3 7",
				transform: `rotate(${r})`,
				fill: "none"
			}, r))
		})]
	})
};
function MotifArt({ kind, x, y, s = 1, rot = 0, fill, accent = "#fff", filter }) {
	return /* @__PURE__ */ jsx("g", {
		"data-art": `motif.${kind}`,
		transform: `translate(${x} ${y}) rotate(${rot}) scale(${s})`,
		filter,
		children: (MOTIF_ART[kind] ?? MOTIF_ART.star)(fill, accent)
	});
}
//#endregion
//#region app/components/garments/trims.tsx
function scatter(p, region, n) {
	const cx = region.cx ?? 100;
	return Array.from({ length: n }, () => {
		const y = region.y0 + p.r.next() * (region.y1 - region.y0);
		const w = Math.max(0, region.w(y) - 3);
		return {
			x: cx + (p.r.next() * 2 - 1) * w,
			y
		};
	});
}
/**
* Eyelet (broderie anglaise) lace edge — the scalloped, hole-punched trim CLAMP draws on
* petticoats, collars and cuffs. Hangs below the given edge.
*/
function Eyelet({ p, pts, size = 3, k = "trim.eyelet-lace", color = "#fffaf4" }) {
	const q = along(pts, Math.max(3, Math.round(pathLength(pts) / (size * 1.9))));
	if (q.length < 2) return null;
	const step = Math.hypot(q[1].x - q[0].x, q[1].y - q[0].y);
	const scallops = q.map((c) => `M${c.x - step / 2} ${c.y}a${step / 2} ${size} 0 0 0 ${step} 0`).join("");
	return /* @__PURE__ */ jsxs(Art, {
		k,
		children: [
			/* @__PURE__ */ jsx("path", {
				d: scallops + `M${q[0].x - step / 2} ${q[0].y}` + q.map((c) => `L${c.x + step / 2} ${c.y}`).join(""),
				fill: color,
				stroke: INK,
				strokeWidth: .4,
				strokeLinejoin: "round"
			}),
			q.map((c, i) => /* @__PURE__ */ jsxs("g", {
				fill: "none",
				stroke: INK,
				strokeWidth: .3,
				children: [/* @__PURE__ */ jsx("ellipse", {
					cx: c.x,
					cy: c.y + size * .45,
					rx: step * .14,
					ry: size * .22
				}), i % 2 === 0 && /* @__PURE__ */ jsx("circle", {
					cx: c.x + step / 2,
					cy: c.y + size * .2,
					r: size * .1
				})]
			}, i)),
			/* @__PURE__ */ jsx("path", {
				d: curve(pts.map((a) => pt(a.x, a.y + .6)), false),
				fill: "none",
				stroke: p.secondary,
				strokeWidth: .5,
				strokeDasharray: "0.8 0.8",
				opacity: .8
			})
		]
	});
}
function pathLength(pts) {
	let l = 0;
	for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
	return l;
}
function Trim({ p, kind, top = [], hem = [], region }) {
	const k = `trim.${kind.toLowerCase().replace(/[^a-z]+/g, "-")}`;
	const n = 6 + p.density * 3;
	const glow = `url(#${p.uid}-glow)`;
	const hemLine = hem.length > 1 ? curve(hem.map((q) => pt(q.x, q.y)), false) : "";
	switch (kind) {
		case "Beading":
		case "Pearls":
		case "Rhinestones": {
			const c = kind === "Pearls" ? "#fbf6ee" : kind === "Rhinestones" ? "#ffffff" : p.accent;
			const r = kind === "Pearls" ? 1.4 : .85;
			return /* @__PURE__ */ jsxs(Art, {
				k,
				children: [along(top, 9 + p.density * 2).map((q, i) => /* @__PURE__ */ jsx(Bead, {
					x: q.x,
					y: q.y + 1.2,
					r,
					c
				}, `t${i}`)), along(hem, 12 + p.density * 3).map((q, i) => /* @__PURE__ */ jsx(Bead, {
					x: q.x,
					y: q.y - 1.6,
					r,
					c
				}, `h${i}`))]
			});
		}
		case "Crystals":
		case "Glitter":
		case "Sequins":
			if (!region) return null;
			return /* @__PURE__ */ jsx(Art, {
				k,
				children: scatter(p, region, kind === "Crystals" ? n : n * 2).map((q, i) => kind === "Crystals" ? /* @__PURE__ */ jsx(Sparkle, {
					x: q.x,
					y: q.y,
					s: 1.6 + p.r.next() * 2,
					glow
				}, i) : /* @__PURE__ */ jsx("circle", {
					cx: q.x,
					cy: q.y,
					r: kind === "Sequins" ? 1 : .45,
					fill: kind === "Sequins" ? p.metal : "#fff",
					stroke: kind === "Sequins" ? INK : "none",
					strokeWidth: .25
				}, i))
			});
		case "Feathers": return hemLine ? /* @__PURE__ */ jsxs(Art, {
			k,
			children: [/* @__PURE__ */ jsx(Fluff, {
				d: hemLine,
				c: p.light,
				w: 5.5,
				gap: 3.4
			}), /* @__PURE__ */ jsx(Fluff, {
				d: hemLine,
				c: p.secondary,
				w: 3.2,
				gap: 5,
				o: .9
			})]
		}) : null;
		case "Fringe": return /* @__PURE__ */ jsx(Art, {
			k,
			children: along(hem, 20 + p.density * 4).map((q, i) => /* @__PURE__ */ jsx("path", {
				d: `M${q.x} ${q.y}l${(i % 2 - .5) * .8} ${10 + i % 3 * 2.5}`,
				stroke: p.secondary,
				strokeWidth: .7,
				strokeLinecap: "round"
			}, i))
		});
		case "Ruffles": return hem.length > 1 ? /* @__PURE__ */ jsx(Eyelet, {
			p,
			pts: hem,
			size: 3.4,
			k,
			color: p.light
		}) : null;
		case "Bows": {
			const at = top.length ? top[Math.floor(top.length / 2)] : region ? {
				x: region.cx ?? 100,
				y: region.y0 + 5
			} : null;
			return at ? /* @__PURE__ */ jsx(Art, {
				k,
				children: /* @__PURE__ */ jsx(MotifArt, {
					kind: "bow",
					x: at.x,
					y: at.y + 3,
					s: .55,
					fill: p.secondary,
					accent: p.accent
				})
			}) : null;
		}
		case "Appliqué":
		case "Flowers":
		case "Enamel":
			if (!region) return null;
			return /* @__PURE__ */ jsx(Art, {
				k,
				children: scatter(p, region, 3 + p.density).map((q, i) => /* @__PURE__ */ jsx(MotifArt, {
					kind: kind === "Flowers" ? "flower" : p.spec.motif,
					x: q.x,
					y: q.y,
					s: .34 + p.r.next() * .16,
					rot: p.r.int(-25, 25),
					fill: kind === "Enamel" ? p.secondary : p.accent,
					accent: p.secondary
				}, i))
			});
		case "Embroidery": return /* @__PURE__ */ jsxs(Art, {
			k,
			children: [hemLine && /* @__PURE__ */ jsx("path", {
				d: hemLine,
				transform: "translate(0 -3.4)",
				fill: "none",
				stroke: p.metal,
				strokeWidth: .5,
				strokeDasharray: "1.2 0.9"
			}), along(hem.map((q) => ({
				x: q.x,
				y: q.y - 7.5
			})), 5 + p.density).map((q, i) => /* @__PURE__ */ jsx(MotifArt, {
				kind: p.spec.motif,
				x: q.x,
				y: q.y,
				s: .24,
				fill: p.metal,
				accent: p.accent
			}, i))]
		});
		case "Chains": {
			if (!region) return null;
			const cx = region.cx ?? 100;
			const y = region.y0 + (region.y1 - region.y0) * .45;
			const w = region.w(y) + 1;
			return /* @__PURE__ */ jsxs(Art, {
				k,
				children: [/* @__PURE__ */ jsx(Chain, {
					d: `M${cx - w} ${y}Q${cx} ${y + 13} ${cx + w} ${y}`,
					c: p.metal
				}), /* @__PURE__ */ jsx(Chain, {
					d: `M${cx - w + 2} ${y + 3}Q${cx} ${y + 21} ${cx + w - 2} ${y + 3}`,
					c: p.metal
				})]
			});
		}
		case "Studs":
		case "Hardware": return /* @__PURE__ */ jsx(Art, {
			k,
			children: along(top, 8 + p.density * 2).map((q, i) => /* @__PURE__ */ jsx("path", {
				d: `M${q.x - 1.3} ${q.y + 3}L${q.x} ${q.y + 1}L${q.x + 1.3} ${q.y + 3}Z`,
				fill: p.metal,
				stroke: INK,
				strokeWidth: .3
			}, i))
		});
		case "Spikes": return /* @__PURE__ */ jsx(Art, {
			k,
			children: along(top.length ? top : hem, 7 + p.density * 2).map((q, i) => /* @__PURE__ */ jsx("path", {
				d: `M${q.x - 1.4} ${q.y + 1}L${q.x} ${q.y - 4}L${q.x + 1.4} ${q.y + 1}Z`,
				fill: p.metal,
				stroke: INK,
				strokeWidth: .35
			}, i))
		});
		case "Charms": return /* @__PURE__ */ jsx(Art, {
			k,
			children: along(hem, 3 + p.density).map((q, i) => /* @__PURE__ */ jsxs("g", { children: [/* @__PURE__ */ jsx(Line, {
				d: `M${q.x} ${q.y}v4`,
				c: p.metal,
				o: 1,
				w: .5
			}), /* @__PURE__ */ jsx(MotifArt, {
				kind: p.spec.motif,
				x: q.x,
				y: q.y + 6.5,
				s: .24,
				fill: p.accent,
				accent: p.metal
			})] }, i))
		});
		case "LEDs":
		case "LED lights":
			if (!region) return null;
			return /* @__PURE__ */ jsx(Art, {
				k,
				className: "art-led",
				children: scatter(p, region, n).map((q, i) => /* @__PURE__ */ jsx("circle", {
					cx: q.x,
					cy: q.y,
					r: 1,
					fill: `hsl(${(p.item.hue + i * 50) % 360} 100% 75%)`,
					filter: glow
				}, i))
			});
		case "Metallic filigree":
			if (!region) return null;
			return /* @__PURE__ */ jsx(Art, {
				k,
				children: scatter(p, region, 3 + p.density).map((q, i) => /* @__PURE__ */ jsx("path", {
					d: `M${q.x - 5} ${q.y}c1.6-4 5-4 5 0s3.4 4 5 0`,
					fill: "none",
					stroke: p.metal,
					strokeWidth: .6
				}, i))
			});
		default: return null;
	}
}
/** Lacing ladder between two parallel lines (corset lacing, lace-up sides). */
function Lacing({ x, y0, y1, w = 3, c, k = "trim.lacing" }) {
	const n = Math.max(2, Math.round((y1 - y0) / 6));
	let d = "";
	for (let i = 0; i < n; i++) {
		const a = y0 + (y1 - y0) * i / n;
		const b = y0 + (y1 - y0) * (i + 1) / n;
		d += `M${x - w} ${a}L${x + w} ${b}M${x + w} ${a}L${x - w} ${b}`;
	}
	return /* @__PURE__ */ jsxs(Art, {
		k,
		children: [
			/* @__PURE__ */ jsx(Line, {
				d: `M${x - w} ${y0}V${y1}M${x + w} ${y0}V${y1}`,
				w: .4,
				o: .55
			}),
			/* @__PURE__ */ jsx("path", {
				d,
				stroke: INK,
				strokeWidth: 1.2,
				strokeLinecap: "round"
			}),
			/* @__PURE__ */ jsx("path", {
				d,
				stroke: c,
				strokeWidth: .65,
				strokeLinecap: "round"
			}),
			Array.from({ length: n + 1 }, (_, i) => /* @__PURE__ */ jsxs("g", { children: [/* @__PURE__ */ jsx("circle", {
				cx: x - w,
				cy: y0 + (y1 - y0) * i / n,
				r: .6,
				fill: INK
			}), /* @__PURE__ */ jsx("circle", {
				cx: x + w,
				cy: y0 + (y1 - y0) * i / n,
				r: .6,
				fill: INK
			})] }, i)),
			/* @__PURE__ */ jsx("path", {
				d: `M${x} ${y0 - .5}q-4 -2 -5 1q2 2 5 -1q4 -2 5 1q-2 2 -5 -1M${x} ${y0}l-2 5M${x} ${y0}l2 5`,
				fill: "none",
				stroke: c,
				strokeWidth: .7
			})
		]
	});
}
//#endregion
//#region app/components/garments/upper.tsx
/**
* Dresses + tops. Labels:
*   dresses.silhouette.<x> / tops.fit.<x>     main body piece
*   <cat>.neckline.<x>, <cat>.sleeves.<x>, <cat>.construction.<x>, <cat>.cutouts.<x>, <cat>.signature.<x>
*   <cat>.folds (CLAMP drape lines), <cat>.hem.eyelet-lace
*/
var artKey = (cat, param, value) => `${cat}.${slug(param)}.${slug(value)}`;
var SH$1 = Y.shoulder;
var ARMPIT = SH$1 + 19;
/** Right-half neckline edge, center → armpit. x is relative to center. */
function neckEdge(b, nl, strap, side) {
	const S = (y) => pt(side(y), y);
	const sh = b.shoulder;
	const nk = b.neck;
	const shoulderCover = (centerY, open, corner = true) => [
		pt(0, centerY, corner),
		pt(nk + open, SH$1 - 5, true),
		pt(sh - 4, SH$1 - 1.5, true),
		pt(sh - 1, SH$1 + 8),
		S(ARMPIT)
	];
	switch (nl) {
		case "Strapless": return [
			pt(0, Y.bust - 9),
			pt(b.bust * .55, Y.bust - 11),
			S(Y.bust - 7)
		];
		case "Sweetheart": return [
			pt(0, Y.bust - 1, true),
			pt(b.bust * .42, Y.bust - 12),
			pt(b.bust * .85, Y.bust - 10),
			S(Y.bust - 5)
		];
		case "Off-shoulder": return [
			pt(0, SH$1 + 11),
			pt(sh * .55, SH$1 + 8),
			pt(sh + 3.5, SH$1 + 6),
			pt(sh + 5.5, SH$1 + 16, true),
			S(ARMPIT + 4)
		];
		case "Halter": return [
			pt(0, Y.neck + 3),
			pt(nk + 2, Y.neck + 2.5, true),
			pt(b.bust * .72, Y.bust - 10),
			S(ARMPIT + 2)
		];
		case "V-neck": return strap ? [
			pt(0, Y.bust + 8, true),
			pt(b.bust * .62, Y.bust - 10),
			S(Y.bust - 6)
		] : shoulderCover(Y.bust + 8, 4);
		case "Plunging": return strap ? [
			pt(0, Y.waist - 8, true),
			pt(b.bust * .5, Y.bust - 9),
			S(Y.bust - 5)
		] : shoulderCover(Y.waist - 6, 3);
		case "Square": return strap ? [
			pt(0, Y.bust - 9),
			pt(b.bust * .62, Y.bust - 9, true),
			S(Y.bust - 6)
		] : [
			pt(0, Y.bust - 7),
			pt(nk + 8, Y.bust - 7, true),
			pt(nk + 8, SH$1 - 4, true),
			pt(sh - 5, SH$1 - 1.5, true),
			pt(sh - 1, SH$1 + 8),
			S(ARMPIT)
		];
		case "Cowl": return strap ? [
			pt(0, Y.bust - 8),
			pt(b.bust * .6, Y.bust - 13),
			S(Y.bust - 6)
		] : shoulderCover(SH$1 + 10, 8, false);
		case "High neck": return [
			pt(0, Y.chin + 1),
			pt(nk + 1.2, Y.chin + 1, true),
			pt(nk + 2.5, Y.neck + 4),
			pt(sh - 3, SH$1 - 1),
			pt(sh - 1, SH$1 + 8),
			S(ARMPIT)
		];
		default: return shoulderCover(SH$1 - 2, 4.5, false);
	}
}
/** Joins right & left halves (both center → around → center) into one closed path. */
function joinHalves(R, L, cx = 100) {
	const right = R.map((q) => ({
		...q,
		x: cx + q.x
	}));
	let left = [...L].reverse().map((q) => ({
		...q,
		x: cx - q.x
	}));
	if (Math.abs(L[L.length - 1].x) < .01 && Math.abs(L[L.length - 1].y - R[R.length - 1].y) < .5) left = left.slice(1);
	if (Math.abs(L[0].x) < .01 && Math.abs(L[0].y - R[0].y) < .5) left = left.slice(0, -1);
	return {
		d: curve([...right, ...left]),
		pts: [...right, ...left]
	};
}
function halfOutline(edge, side, hemY, hemCurve, bottom) {
	const yA = edge[edge.length - 1].y;
	const out = [...edge];
	const n = Math.max(1, Math.round((hemY - yA) / 8));
	for (let i = 1; i <= n; i++) {
		const y = yA + (hemY - yA) * i / n;
		out.push(pt(side(y), y, i === n));
	}
	if (bottom) return [...out, ...bottom];
	const w = side(hemY);
	out.push(pt(w * .5, hemY + hemCurve * .75), pt(0, hemY + hemCurve));
	return out;
}
function sleeveSpec(kind, ease, ex) {
	const fit = (t) => 5.8 - 2.4 * t + ease;
	const both = [-1, 1];
	const s = (t0, t1, w, sides = both) => ({
		t0,
		t1,
		w,
		sides
	});
	const puffAmp = 4.5 + 2 * ex;
	const clamp01 = (v) => Math.min(1, Math.max(0, v));
	switch (kind) {
		case "Cap":
		case "Cap sleeves": return [s(-.02, .16, () => 6.8 + ease)];
		case "Short": return [s(-.02, .36, (t) => 6.5 - 1.4 * t + ease)];
		case "Long":
		case "Long sleeves":
		case "Fitted": return [s(-.02, 1, fit)];
		case "Puff":
		case "Puff sleeves": return [s(-.02, .34, (t) => 5.8 + ease + puffAmp * Math.sin(Math.PI * clamp01(t / .34)))];
		case "Bell":
		case "Bell sleeves": return [s(-.02, 1.04, (t) => t < .5 ? fit(t) : fit(t) + Math.pow((t - .5) / .54, 1.6) * (14 + ex * 6))];
		case "Balloon": return [s(-.02, .97, (t) => 5.4 + ease + (6.5 + ex * 2) * Math.pow(Math.sin(Math.PI * t / .97), .8))];
		case "Detached":
		case "Detached sleeves": return [s(.3, 1, fit)];
		case "One sleeve": return [s(-.02, 1, fit, [-1])];
		case "Exaggerated": return [s(-.02, 1, fit), s(-.04, .5, (t) => 5.8 + ease + (9 + ex * 3.5) * Math.sin(Math.PI * clamp01(t / .5)))];
		case "Oversized": return [s(-.02, 1, (t) => 8.3 + ease - 1.3 * t)];
		case "Extra-long": return [s(-.02, 1.25, (t) => fit(Math.min(t, 1)) + 1)];
		case "Detachable": return [s(-.02, 1, fit)];
		default: return [];
	}
}
function Sleeves({ p, kind, cat, ease = 0 }) {
	const specs = sleeveSpec(kind, ease, p.ex);
	if (!specs.length) return null;
	const lace = attr(p.spec, "Material") === "Lace";
	return /* @__PURE__ */ jsx(Art, {
		k: artKey(cat, "sleeves", kind),
		children: specs.map((sp, i) => sp.sides.map((side) => /* @__PURE__ */ jsxs("g", { children: [
			/* @__PURE__ */ jsx(Fab, {
				p,
				d: armTube(p.b, side, sp.t0, sp.t1, sp.w),
				alpha: p.alphaMixed
			}),
			sp.t1 > .6 && /* @__PURE__ */ jsx(Line, {
				d: [
					.25,
					.42,
					.7
				].map((t) => {
					const a = armAt(p.b, side, t);
					const w = sp.w(t) * .7;
					return `M${a.x - w} ${a.y - 1}q${w} 2.5 ${w * 1.6} 0.6`;
				}).join(""),
				w: .35,
				o: .45
			}),
			(kind === "Detached" || kind === "Detached sleeves") && (() => {
				const q = armAt(p.b, side, .32);
				return /* @__PURE__ */ jsx(Line, {
					d: `M${q.x - 5} ${q.y - 1}l10 2`,
					w: 2,
					c: p.secondary,
					o: 1
				});
			})(),
			kind === "Detachable" && (() => {
				const q = armAt(p.b, side, .3);
				return /* @__PURE__ */ jsx(Line, {
					d: `M${q.x - 5} ${q.y - 2}l10 2.5`,
					dash: "1.2 1",
					o: .7
				});
			})(),
			lace && sp.t1 > .9 && (() => {
				const q = armAt(p.b, side, Math.min(1, sp.t1));
				return /* @__PURE__ */ jsx(Eyelet, {
					p,
					pts: [pt(q.x - 6, q.y), pt(q.x + 6, q.y + 1)],
					size: 2.4
				});
			})()
		] }, `${i}${side}`)))
	});
}
/** Big flared ruffle cuffs at the wrists (signature "Statement cuffs"). */
function Cuffs({ p }) {
	return /* @__PURE__ */ jsx(Art, {
		k: "signature.statement-cuffs",
		children: [-1, 1].map((side) => /* @__PURE__ */ jsxs("g", { children: [/* @__PURE__ */ jsx(Fab, {
			p,
			fill: p.fabric2,
			d: armTube(p.b, side, .84, 1.08, (t) => 3.4 + (t - .84) * 44)
		}), (() => {
			const q = armAt(p.b, side, 1);
			return /* @__PURE__ */ jsx(Eyelet, {
				p,
				pts: [pt(q.x - 8, q.y + 4), pt(q.x + 8, q.y + 6)],
				size: 2.2
			});
		})()] }, side))
	});
}
function assemble(p, neckline, strap, side, hemY, opts = {}) {
	const b = p.b;
	const curveDepth = opts.curveDepth ?? Math.min(6, side(hemY) * .09);
	let rEdge;
	let lEdge;
	if (neckline === "Asymmetrical") {
		rEdge = [
			pt(0, SH$1 + 7),
			pt(b.bust * .6, Y.bust - 10),
			pt(side(Y.bust - 6), Y.bust - 6)
		];
		lEdge = [
			pt(0, SH$1 + 7),
			pt(b.neck + 3.5, SH$1 - 5, true),
			pt(b.shoulder - 4, SH$1 - 1.5, true),
			pt(b.shoulder - 1, SH$1 + 8),
			pt(side(ARMPIT), ARMPIT)
		];
	} else rEdge = lEdge = neckEdge(b, neckline, strap, side);
	const hemL = opts.asymHem ? Math.max(Y.waist + 34, hemY - 42) : hemY;
	const { d, pts } = joinHalves(halfOutline(rEdge, side, hemY, curveDepth, opts.bottom), halfOutline(lEdge, side, hemL, curveDepth, opts.bottom));
	const top = [...[...lEdge].reverse().map((q) => pt(100 - q.x, q.y)), ...rEdge.slice(1).map((q) => pt(100 + q.x, q.y))];
	const hemPts = [];
	for (let i = 0; i <= 12; i++) {
		const u = i / 12;
		const x = -1 + 2 * u;
		const y = hemL + (hemY - hemL) * u + curveDepth * (1 - x * x);
		const w = side(hemL + (hemY - hemL) * u);
		hemPts.push(pt(100 + x * w, y));
	}
	return {
		d,
		pts,
		top,
		hem: opts.bottom ? [] : hemPts,
		side,
		hemY
	};
}
function Straps({ p, top }) {
	const b = p.b;
	const mid = top.length ? top[Math.floor(top.length / 2)] : pt(100, Y.bust - 8);
	return /* @__PURE__ */ jsx(Art, {
		k: "straps.spaghetti",
		children: [-1, 1].map((s) => {
			const fromX = 100 + s * b.bust * .55;
			const d = `M${fromX} ${Math.max(mid.y - 2, Y.bust - 12)}C${fromX} ${SH$1 + 8} ${100 + s * (b.shoulder - 8)} ${SH$1 + 3} ${100 + s * (b.shoulder - 9)} ${SH$1 - 3}`;
			return /* @__PURE__ */ jsxs("g", { children: [/* @__PURE__ */ jsx("path", {
				d,
				stroke: INK,
				strokeWidth: 1.7,
				fill: "none",
				strokeLinecap: "round"
			}), /* @__PURE__ */ jsx("path", {
				d,
				stroke: p.primary,
				strokeWidth: .9,
				fill: "none",
				strokeLinecap: "round"
			})] }, s);
		})
	});
}
/**
* CLAMP drape: long, slightly wavy fold lines falling from the waist seam to the hem.
* Softer fabrics get more folds.
*/
function Folds({ p, s, y0, cat }) {
	const mat = attr(p.spec, "Material");
	const n = [
		"Leather",
		"Latex",
		"Denim",
		"Metallic fabric",
		"Sequins"
	].includes(mat) ? 3 : 6 + p.density;
	if (s.hemY - y0 < 30) return null;
	const d = Array.from({ length: n }, (_, i) => {
		const u = (i + .5) / n - .5;
		const len = .55 + i * 37 % 10 / 22;
		const yEnd = y0 + (s.hemY - y0) * len;
		const x0 = 100 + u * 1.6 * s.side(y0 + 6);
		const x1 = 100 + u * 1.9 * s.side(yEnd);
		return `M${x0} ${y0 + 8}C${x0 + 2} ${(y0 + yEnd) / 2} ${x1 - 2} ${(y0 + yEnd) / 2 + 10} ${x1} ${yEnd}`;
	}).join("");
	return /* @__PURE__ */ jsx(Art, {
		k: `${cat}.folds`,
		clipPath: `url(#${p.uid}-clip)`,
		children: /* @__PURE__ */ jsx(Line, {
			d,
			w: .38,
			o: .42
		})
	});
}
/** Construction detail lines, clipped to the garment. */
function Construction({ p, kind, s, y0, cat }) {
	const k = artKey(cat, "construction", kind);
	const clip = `url(#${p.uid}-clip)`;
	const H = s.hemY;
	const W = (y) => s.side(y);
	switch (kind) {
		case "Pleated": {
			const n = 8 + p.density * 2;
			const d = Array.from({ length: n }, (_, i) => {
				const u = (i + .5) / n - .5;
				return `M${100 + u * 2 * W(y0)} ${y0}L${100 + u * 2 * W(H)} ${H + 8}`;
			}).join("");
			return /* @__PURE__ */ jsx(Art, {
				k,
				clipPath: clip,
				children: /* @__PURE__ */ jsx(Line, {
					d,
					w: .45,
					o: .55
				})
			});
		}
		case "Ruched": {
			const d = Array.from({ length: 9 }, (_, i) => {
				const y = Y.bust - 6 + i * 7;
				const w = W(y) * .7;
				return `M${100 - w} ${y}Q100 ${y + 4} ${100 + w} ${y}`;
			}).join("");
			return /* @__PURE__ */ jsx(Art, {
				k,
				clipPath: clip,
				children: /* @__PURE__ */ jsx(Line, {
					d,
					w: .45,
					o: .5
				})
			});
		}
		case "Layered":
		case "Tiered": {
			const tiers = [.4, .7].map((u) => y0 + (H - y0) * u);
			return /* @__PURE__ */ jsx(Art, {
				k,
				clipPath: clip,
				children: tiers.map((y, i) => {
					const w = W(y) + 2;
					const n = 8;
					const d = `M${100 - w - 4} ${y}` + Array.from({ length: n }, () => `q${w / n} 4 ${2 * w / n} 0`).join("") + `V${H + 12}H${100 - w - 4}Z`;
					return /* @__PURE__ */ jsx("path", {
						d,
						fill: i ? p.fabric2 : p.fabric,
						fillOpacity: p.alphaMixed * .55,
						stroke: INK,
						strokeWidth: .55
					}, i);
				})
			});
		}
		case "Paneled": return /* @__PURE__ */ jsx(Art, {
			k,
			clipPath: clip,
			children: /* @__PURE__ */ jsx(Line, {
				d: curve([
					pt(91, ARMPIT),
					pt(100 - W(Y.waist) * .45, Y.waist),
					pt(100 - W(H) * .45, H + 6)
				], false) + curve([
					pt(109, ARMPIT),
					pt(100 + W(Y.waist) * .45, Y.waist),
					pt(100 + W(H) * .45, H + 6)
				], false),
				w: .5,
				o: .55
			})
		});
		case "Structured":
		case "Corseted": return /* @__PURE__ */ jsxs(Art, {
			k,
			clipPath: clip,
			children: [/* @__PURE__ */ jsx(Line, {
				d: [
					-.66,
					-.33,
					.33,
					.66
				].map((u) => `M${100 + u * 18} ${Y.bust - 6}Q${100 + u * 13} ${Y.waist - 8} ${100 + u * 15} ${Math.min(H, Y.highHip)}`).join(""),
				w: .45,
				o: .55
			}), kind === "Corseted" && /* @__PURE__ */ jsx(Lacing, {
				x: 100,
				y0: Y.bust,
				y1: Math.min(H - 4, Y.waist + 8),
				w: 2.5,
				c: p.secondary
			})]
		});
		case "Draped": return /* @__PURE__ */ jsx(Art, {
			k,
			clipPath: clip,
			children: /* @__PURE__ */ jsx(Line, {
				d: [
					0,
					11,
					22
				].map((o) => `M66 ${Y.underbust + o}Q102 ${Y.waist + o + 8} 138 ${Y.hip + o + 16}`).join(""),
				w: .5,
				o: .5
			})
		});
		case "Wrapped": return /* @__PURE__ */ jsxs(Art, {
			k,
			children: [/* @__PURE__ */ jsxs("g", {
				clipPath: clip,
				children: [/* @__PURE__ */ jsx(Line, {
					d: `M${100 - p.b.neck - 3} ${SH$1 - 4}Q103 ${Y.bust + 12} ${100 + W(Y.waist) - 2} ${Y.waist + 2}`,
					w: .7,
					o: .75
				}), /* @__PURE__ */ jsx(Line, {
					d: `M${100 + W(Y.waist) - 2} ${Y.waist + 2}Q105 ${Y.hip} ${100 + W(H) * .3} ${H + 6}`,
					w: .55,
					o: .55
				})]
			}), /* @__PURE__ */ jsx(MotifArt, {
				kind: "bow",
				x: 100 + W(Y.waist) - 1,
				y: Y.waist + 3,
				s: .45,
				fill: p.secondary,
				accent: p.accent
			})]
		});
		case "Deconstructed": return /* @__PURE__ */ jsxs(Art, {
			k,
			children: [/* @__PURE__ */ jsx("g", {
				clipPath: clip,
				children: /* @__PURE__ */ jsx(Line, {
					d: `M74 ${Y.underbust}L128 ${Y.waist + 24}`,
					w: .5,
					o: .6,
					dash: "1.6 1.2"
				})
			}), /* @__PURE__ */ jsx("path", {
				d: `M${100 - W(H) * .9} ${H}` + Array.from({ length: 8 }, (_, i) => `L${100 - W(H) * .9 + (i + .5) * W(H) * 1.8 / 8} ${H + (i % 2 ? 0 : 5)}`).join(""),
				fill: "none",
				stroke: INK,
				strokeWidth: .55
			})]
		});
		default: return null;
	}
}
/** Cutouts are holes in the garment (an SVG mask) — the skin shows through. */
function CutoutMask({ p, kinds, side }) {
	const holes = [];
	for (const k of kinds) {
		if (k === "Waist" || k === "Full-body cutouts") for (const s of [-1, 1]) holes.push(/* @__PURE__ */ jsx("ellipse", {
			cx: 100 + s * (side(Y.waist) - 4),
			cy: Y.waist - 3,
			rx: 4.5,
			ry: 9
		}, `w${s}`));
		if (k === "Hips" || k === "Full-body cutouts") for (const s of [-1, 1]) holes.push(/* @__PURE__ */ jsx("path", { d: `M${100 + s * (side(Y.highHip) - 2)} ${Y.highHip - 7}q${-s * 11} 10 0 22z` }, `h${s}`));
		if (k === "Chest" || k === "Full-body cutouts") holes.push(/* @__PURE__ */ jsx("path", { d: `M100 ${Y.bust - 6}l6 8-6 10-6-10z` }, "c"));
		if (k === "Side") for (const s of [-1, 1]) holes.push(/* @__PURE__ */ jsx("ellipse", {
			cx: 100 + s * (side(Y.underbust) - 3),
			cy: Y.underbust + 6,
			rx: 3.4,
			ry: 18
		}, `s${s}`));
		if (k === "Full-body cutouts") holes.push(/* @__PURE__ */ jsx("circle", {
			cx: 100,
			cy: Y.waist + 6,
			r: 3.8
		}, "f"));
	}
	return /* @__PURE__ */ jsxs("mask", {
		id: `${p.uid}-cut`,
		maskUnits: "userSpaceOnUse",
		x: -200,
		y: -100,
		width: 600,
		height: 600,
		children: [/* @__PURE__ */ jsx("rect", {
			x: -200,
			y: -100,
			width: 600,
			height: 600,
			fill: "#fff"
		}), /* @__PURE__ */ jsx("g", {
			fill: "#000",
			children: holes
		})]
	});
}
function UpperSignature({ p, s, cat }) {
	const sig = p.spec.signature;
	const k = `${cat}.signature.${slug(sig)}`;
	const b = p.b;
	const topMid = s.top.reduce((a, q) => Math.abs(q.x - 100) < Math.abs(a.x - 100) ? q : a, s.top[0] ?? pt(100, Y.bust - 8));
	switch (sig) {
		case "Oversized bow": return /* @__PURE__ */ jsx(Art, {
			k,
			children: /* @__PURE__ */ jsx(MotifArt, {
				kind: "bow",
				x: 100 + (p.r.chance(.5) ? 0 : b.waist - 3),
				y: Y.waist - 2,
				s: 1.3 + p.ex * .25,
				fill: p.secondary,
				accent: p.accent
			})
		});
		case "Corset lacing": return /* @__PURE__ */ jsx(Lacing, {
			k,
			x: 100,
			y0: Math.max(topMid.y + 4, Y.bust - 6),
			y1: Math.min(s.hemY - 4, Y.waist + 12),
			w: 3,
			c: p.metal
		});
		case "Feather hem": return s.hem.length ? /* @__PURE__ */ jsxs(Art, {
			k,
			children: [/* @__PURE__ */ jsx(Fluff, {
				d: curve(s.hem, false),
				c: p.light,
				w: 7,
				gap: 3.4
			}), /* @__PURE__ */ jsx(Fluff, {
				d: curve(s.hem, false),
				c: p.secondary,
				w: 4,
				gap: 6
			})]
		}) : null;
		case "Crystal collar": {
			const pts = s.top.filter((q) => Math.abs(q.x - 100) < 22);
			const arc = pts.length > 1 ? pts : [
				pt(88, SH$1 - 2),
				pt(100, SH$1 + 5),
				pt(112, SH$1 - 2)
			];
			return /* @__PURE__ */ jsx(Art, {
				k,
				children: arc.map((q, i) => /* @__PURE__ */ jsx(MotifArt, {
					kind: "gem",
					x: q.x,
					y: q.y + 3.5,
					s: .32,
					fill: p.accent,
					filter: `url(#${p.uid}-glow)`
				}, i))
			});
		}
		case "Cascading ruffles": {
			const pts = Array.from({ length: 7 }, (_, i) => {
				const y = Y.waist + (s.hemY - Y.waist) * i / 7;
				return pt(100 + s.side(y) * (.2 + i * .1), y);
			});
			return /* @__PURE__ */ jsx(Art, {
				k,
				children: pts.map((q, i) => /* @__PURE__ */ jsx("path", {
					d: `M${q.x - 8} ${q.y}q8 8 16 0q-8 3.5-16 0z`,
					fill: p.fabric2,
					stroke: INK,
					strokeWidth: .5
				}, i))
			});
		}
		case "Draped sash": return /* @__PURE__ */ jsxs(Art, {
			k,
			children: [/* @__PURE__ */ jsx(Fab, {
				p,
				fill: p.fabric2,
				d: `M${100 - b.shoulder + 4} ${SH$1 + 2}L${100 - b.shoulder + 13} ${SH$1}L${100 + s.side(Y.highHip)} ${Y.highHip + 2}L${100 + s.side(Y.highHip) - 4} ${Y.highHip + 11}Z`
			}), /* @__PURE__ */ jsx(Fab, {
				p,
				fill: p.fabric2,
				d: `M${100 + s.side(Y.highHip) - 2} ${Y.highHip + 6}q5 26 -2 52l5 -2q4-26-2-50z`
			})]
		});
		case "Motif brooch": return /* @__PURE__ */ jsx(Art, {
			k,
			children: /* @__PURE__ */ jsx(MotifArt, {
				kind: p.spec.motif,
				x: 100 - b.bust * .45,
				y: Y.bust,
				s: .65,
				fill: p.metal,
				accent: p.accent,
				filter: `url(#${p.uid}-glow)`
			})
		});
		case "Statement cuffs": return /* @__PURE__ */ jsx(Cuffs, { p });
		case "Lace collar": return /* @__PURE__ */ jsxs(Art, {
			k,
			children: [[-1, 1].map((sd) => /* @__PURE__ */ jsx(Fab, {
				p,
				fill: "#fffaf4",
				d: curve([
					pt(100, SH$1 - 3, true),
					pt(100 + sd * (b.neck + 1), SH$1 - 6),
					pt(100 + sd * (b.neck + 12), SH$1 - 2),
					pt(100 + sd * (b.neck + 11), SH$1 + 8),
					pt(100 + sd * 2, SH$1 + 8)
				])
			}, sd)), /* @__PURE__ */ jsx(Eyelet, {
				p,
				pts: [
					pt(100 - b.neck - 12, SH$1 + 8),
					pt(100, SH$1 + 10),
					pt(100 + b.neck + 12, SH$1 + 8)
				],
				size: 2.4
			})]
		});
		case "Sailor collar": return /* @__PURE__ */ jsxs(Art, {
			k,
			children: [
				/* @__PURE__ */ jsx(Fab, {
					p,
					fill: p.fabric2,
					d: curve([
						pt(100, Y.bust - 2, true),
						pt(100 - b.neck - 2, SH$1 - 4, true),
						pt(100 - b.shoulder + 1, SH$1 + 2, true),
						pt(100 - b.shoulder + 3, SH$1 + 16, true),
						pt(94, SH$1 + 15),
						pt(100, Y.bust - 2, true),
						pt(106, SH$1 + 15),
						pt(100 + b.shoulder - 3, SH$1 + 16, true),
						pt(100 + b.shoulder - 1, SH$1 + 2, true),
						pt(100 + b.neck + 2, SH$1 - 4, true)
					])
				}),
				/* @__PURE__ */ jsx(Line, {
					d: `M${100 - b.shoulder + 3} ${SH$1 + 13}L94 ${SH$1 + 12}M${100 + b.shoulder - 3} ${SH$1 + 13}L106 ${SH$1 + 12}`,
					c: "#fff",
					w: .9,
					o: 1
				}),
				/* @__PURE__ */ jsx(MotifArt, {
					kind: "bow",
					x: 100,
					y: Y.bust - 1,
					s: .5,
					fill: p.accent,
					accent: p.secondary
				})
			]
		});
		case "Ribbon tie": return /* @__PURE__ */ jsxs(Art, {
			k,
			children: [
				/* @__PURE__ */ jsx(MotifArt, {
					kind: "bow",
					x: 100,
					y: SH$1 - 1,
					s: .75,
					fill: p.accent,
					accent: p.secondary
				}),
				/* @__PURE__ */ jsx("path", {
					d: `M99 ${SH$1 + 3}q-3 12 -8 18M101 ${SH$1 + 3}q3 12 7 19`,
					stroke: INK,
					strokeWidth: 2,
					fill: "none"
				}),
				/* @__PURE__ */ jsx("path", {
					d: `M99 ${SH$1 + 3}q-3 12 -8 18M101 ${SH$1 + 3}q3 12 7 19`,
					stroke: p.accent,
					strokeWidth: 1.2,
					fill: "none"
				})
			]
		});
		default: return null;
	}
}
var DRESS_HEM = [
	LEN.micro,
	LEN.mini,
	LEN.aboveKnee,
	LEN.knee,
	LEN.midi,
	LEN.ankle,
	LEN.floor,
	LEN.train
];
function dressSide(p) {
	const b = p.b;
	const sil = attr(p.spec, "Silhouette");
	const hemY = DRESS_HEM[p.item.size] ?? LEN.knee;
	const body = (y) => torsoHalf(b, y);
	const flare = [
		.6,
		1,
		1.5,
		2.1
	][p.ex];
	const top = (y) => body(y) + 1.6;
	let seam = Y.waist;
	let skirt;
	let bodice = top;
	switch (sil) {
		case "Bodycon":
			skirt = (y) => body(y) + 1.2;
			break;
		case "Column":
			skirt = (y) => y < Y.hip ? body(y) + 2 : b.hip + 2;
			break;
		case "Mermaid":
			skirt = (y) => y < Y.knee ? body(y) + 1.2 : body(Y.knee) + 1.2 + Math.pow((y - Y.knee) / Math.max(20, hemY - Y.knee), 1.6) * 20 * flare;
			break;
		case "Ball gown": {
			const R = b.hip + 20 + 12 * p.ex;
			const span = Math.min(90, hemY - Y.waist);
			skirt = (y) => Math.max(body(y) + 2.5, b.waist + (R - b.waist) * Math.sin(Math.min(1, (y - Y.waist) / span) * Math.PI / 2));
			break;
		}
		case "Empire waist":
			seam = Y.underbust;
			skirt = (y) => Math.max(body(y) + 2.5, b.underbust + 2.5 + (y - Y.underbust) * .2 * flare);
			break;
		case "Shift":
		case "Oversized": {
			const W = Math.max(b.bust, b.hip) + (sil === "Shift" ? 4 : 8 + 3 * p.ex);
			const ramp = (y) => {
				const t = Math.max(0, Math.min(1, (y - (SH$1 + 18)) / 30));
				return t * t * (3 - 2 * t);
			};
			bodice = (y) => Math.max(top(y), top(y) + (W - top(y)) * ramp(y));
			skirt = (y) => Math.max(body(y) + 2, W + (y - Y.waist) * .05);
			break;
		}
		case "Sculptural":
			skirt = (y) => body(y) + 2 + (14 + 9 * p.ex) * Math.exp(-Math.pow((y - (Y.hip + 3)) / 22, 2));
			break;
		default: skirt = sil === "Peplum" ? (y) => body(y) + 1.2 : (y) => {
			const reach = 30 + 14 * p.ex;
			const grow = reach * (1 - Math.exp(-Math.max(0, y - Y.highHip) * .24 * flare / reach));
			return Math.max(body(y) + 2, b.highHip + 2 + grow);
		};
	}
	return {
		side: (y) => y < seam ? bodice(y) : skirt(y),
		seam
	};
}
function Train({ p, wide }) {
	const w = Math.min(wide + 16 + p.ex * 7, 84);
	const d = curve([
		pt(100 - wide * .8, Y.knee - 10),
		pt(100 - w, Y.floor - 6),
		pt(100 - w - 7, Y.floor + 7, true),
		pt(100 + w + 7, Y.floor + 7, true),
		pt(100 + w, Y.floor - 6),
		pt(100 + wide * .8, Y.knee - 10)
	]);
	return /* @__PURE__ */ jsx(Fab, {
		p,
		k: "dresses.signature.sweeping-train",
		d,
		fill: p.fabric,
		alpha: p.alphaMixed
	});
}
function Dress({ p, part }) {
	const { b, spec, item } = p;
	const hemY = DRESS_HEM[item.size] ?? LEN.knee;
	const { side, seam } = dressSide(p);
	const train = item.size === 7 || spec.signature === "Sweeping train";
	if (part === "back") return train ? /* @__PURE__ */ jsx(Train, {
		p,
		wide: side(hemY - 4)
	}) : null;
	const sil = attr(spec, "Silhouette");
	const nl = attr(spec, "Neckline");
	const sleeves = attr(spec, "Sleeves");
	const strap = sleeves === "Spaghetti straps";
	const s = assemble(p, nl, strap, side, hemY, { asymHem: spec.universal.Symmetry === "Asymmetrical" || item.type === "Asymmetrical dress" || attr(spec, "Construction") === "Deconstructed" });
	const cutouts = (spec.attrs.Cutouts ?? "None").split(", ").filter((c) => c !== "None" && c !== "Back");
	const region = {
		y0: Y.bust - 6,
		y1: hemY - 4,
		w: side
	};
	const laceHem = attr(spec, "Material") === "Lace" || attr(spec, "Material") === "Tulle";
	return /* @__PURE__ */ jsxs(Art, {
		k: `dresses.type.${slug(item.type)}`,
		children: [
			/* @__PURE__ */ jsxs("defs", { children: [/* @__PURE__ */ jsx("clipPath", {
				id: `${p.uid}-clip`,
				children: /* @__PURE__ */ jsx("path", { d: s.d })
			}), cutouts.length > 0 && /* @__PURE__ */ jsx(CutoutMask, {
				p,
				kinds: cutouts,
				side
			})] }),
			/* @__PURE__ */ jsxs("g", {
				mask: cutouts.length ? `url(#${p.uid}-cut)` : void 0,
				children: [
					/* @__PURE__ */ jsx(Fab, {
						p,
						d: s.d,
						k: artKey("dresses", "silhouette", sil)
					}),
					/* @__PURE__ */ jsx(Folds, {
						p,
						s,
						y0: seam,
						cat: "dresses"
					}),
					sil === "Empire waist" && /* @__PURE__ */ jsx(Line, {
						d: `M${100 - side(seam)} ${seam}Q100 ${seam + 2.5} ${100 + side(seam)} ${seam}`,
						w: .7,
						o: .75
					}),
					sil === "Peplum" && /* @__PURE__ */ jsx(Peplum, {
						p,
						side,
						cat: "dresses"
					}),
					/* @__PURE__ */ jsx(Construction, {
						p,
						kind: attr(spec, "Construction"),
						s,
						y0: seam,
						cat: "dresses"
					}),
					nl === "Cowl" && /* @__PURE__ */ jsx(Line, {
						d: `M91 ${SH$1 + 2}Q100 ${SH$1 + 9} 109 ${SH$1 + 2}M88 ${SH$1 + 6}Q100 ${SH$1 + 15} 112 ${SH$1 + 6}`,
						w: .45,
						o: .55
					}),
					nl === "High neck" && /* @__PURE__ */ jsx(Fab, {
						p,
						k: "dresses.neckline.high-neck.collar",
						fill: p.fabric2,
						d: `M${100 - b.neck - 1.5} ${Y.chin + 1}h${b.neck * 2 + 3}v4h-${b.neck * 2 + 3}z`
					})
				]
			}),
			laceHem && s.hem.length > 0 && /* @__PURE__ */ jsx(Eyelet, {
				p,
				pts: s.hem,
				size: 3,
				k: "dresses.hem.eyelet-lace"
			}),
			strap && /* @__PURE__ */ jsx(Straps, {
				p,
				top: s.top
			}),
			/* @__PURE__ */ jsx(Sleeves, {
				p,
				kind: sleeves,
				cat: "dresses"
			}),
			(spec.attrs.Embellishment ?? "None").split(", ").map((e) => /* @__PURE__ */ jsx(Trim, {
				p,
				kind: e,
				top: s.top,
				hem: s.hem,
				region
			}, e)),
			/* @__PURE__ */ jsx(UpperSignature, {
				p,
				s,
				cat: "dresses"
			})
		]
	});
}
function Peplum({ p, side, cat }) {
	const y0 = Y.waist;
	const y1 = Y.waist + 20 + p.ex * 3;
	const w0 = side(y0);
	const w1 = side(y1) + 10 + p.ex * 3;
	const d = curve([
		pt(100 - w0, y0, true),
		pt(100 + w0, y0, true),
		pt(100 + w1, y1, true),
		pt(100 + w1 * .5, y1 - 3),
		pt(100, y1 + 2),
		pt(100 - w1 * .5, y1 - 3),
		pt(100 - w1, y1, true)
	]);
	return /* @__PURE__ */ jsx(Fab, {
		p,
		k: `${cat}.peplum`,
		d
	});
}
var TOP_HEM = [
	LEN.microCrop,
	LEN.cropped,
	LEN.waist,
	LEN.hip,
	LEN.tunic,
	Y.hip + 14
];
onTune(() => {
	SH$1 = Y.shoulder;
	ARMPIT = SH$1 + 19;
	DRESS_HEM = [
		LEN.micro,
		LEN.mini,
		LEN.aboveKnee,
		LEN.knee,
		LEN.midi,
		LEN.ankle,
		LEN.floor,
		LEN.train
	];
	TOP_HEM = [
		LEN.microCrop,
		LEN.cropped,
		LEN.waist,
		LEN.hip,
		LEN.tunic,
		Y.hip + 14
	];
});
var FIT_EASE = {
	"Skin-tight": .6,
	Fitted: 1.4,
	Regular: 3.2,
	Relaxed: 5.5,
	Oversized: 10,
	Exaggerated: 15
};
function Top({ p, part }) {
	if (part === "back") return null;
	const { b, spec, item } = p;
	const fit = attr(spec, "Fit");
	const ease = FIT_EASE[fit] ?? 2.5;
	let nl = attr(spec, "Neckline");
	if ([
		"Tube top",
		"Bustier",
		"Corset"
	].includes(item.type) && ![
		"Sweetheart",
		"Square",
		"Off-shoulder"
	].includes(nl)) nl = "Strapless";
	const sleeves = attr(spec, "Sleeves");
	const hemY = TOP_HEM[item.size] ?? LEN.waist;
	const boxy = ease >= 10;
	const W = Math.max(b.bust, b.hip * .9) + ease;
	const side = (y) => {
		const body = torsoHalf(b, y) + Math.min(ease, 3.5);
		if (!boxy) return y > ARMPIT ? Math.max(body, torsoHalf(b, y) + ease * .8) : body;
		return y < ARMPIT ? body + 1.6 : W + (y - ARMPIT) * .04;
	};
	const bodysuit = item.type === "Bodysuit";
	const bottom = bodysuit ? [pt(b.legInner.thigh + 5, Y.crotch - 4), pt(0, Y.crotch + 1)] : void 0;
	const basque = ["Corset", "Bustier"].includes(item.type);
	const strap = item.type === "Bralette" || sleeves === "Sleeveless" && ["V-neck", "Square"].includes(nl) && fit === "Skin-tight";
	const s = assemble(p, nl, strap, side, bodysuit ? Y.highHip + 4 : hemY, {
		asymHem: spec.universal.Symmetry === "Mismatched" && !bodysuit,
		bottom,
		curveDepth: basque ? 8 : void 0
	});
	const region = {
		y0: Y.bust - 6,
		y1: (bodysuit ? Y.highHip : hemY) - 3,
		w: side
	};
	const construction = attr(spec, "Construction");
	return /* @__PURE__ */ jsxs(Art, {
		k: `tops.type.${slug(item.type)}`,
		children: [
			/* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsx("clipPath", {
				id: `${p.uid}-clip`,
				children: /* @__PURE__ */ jsx("path", { d: s.d })
			}) }),
			/* @__PURE__ */ jsx(Fab, {
				p,
				d: s.d,
				k: artKey("tops", "fit", fit)
			}),
			(item.type === "Peplum top" || item.type === "Sculptural top" && p.ex > 1) && /* @__PURE__ */ jsx(Peplum, {
				p,
				side,
				cat: "tops"
			}),
			/* @__PURE__ */ jsx(Construction, {
				p,
				kind: construction,
				s,
				y0: ARMPIT,
				cat: "tops"
			}),
			(item.type === "Corset" || item.type === "Bustier") && construction !== "Corseted" && /* @__PURE__ */ jsx(Art, {
				k: "tops.boning",
				clipPath: `url(#${p.uid}-clip)`,
				children: /* @__PURE__ */ jsx(Line, {
					d: [
						-.6,
						-.25,
						.25,
						.6
					].map((u) => `M${100 + u * 20} ${Y.bust - 8}Q${100 + u * 13} ${Y.waist - 8} ${100 + u * 16} ${hemY + 6}`).join(""),
					w: .45,
					o: .55
				})
			}),
			item.type === "Shirt" && /* @__PURE__ */ jsxs(Art, {
				k: "tops.placket",
				children: [
					/* @__PURE__ */ jsx(Line, {
						d: `M100 ${SH$1 + 2}V${hemY}`,
						w: .5,
						o: .65
					}),
					Array.from({ length: Math.max(1, Math.floor((hemY - SH$1 - 8) / 14)) }, (_, i) => /* @__PURE__ */ jsx("circle", {
						cx: 101.6,
						cy: SH$1 + 10 + i * 14,
						r: .9,
						fill: p.metal,
						stroke: "#2b1b33",
						strokeWidth: .3
					}, i)),
					/* @__PURE__ */ jsx(Fab, {
						p,
						fill: p.fabric2,
						d: `M100 ${SH$1 - 4}L${100 - b.neck - 6} ${SH$1 - 8}L${100 - b.neck - 2} ${SH$1 + 4}Z M100 ${SH$1 - 4}L${100 + b.neck + 6} ${SH$1 - 8}L${100 + b.neck + 2} ${SH$1 + 4}Z`
					})
				]
			}),
			item.type === "T-shirt" && p.r.chance(.5) && /* @__PURE__ */ jsx(MotifArt, {
				kind: spec.motif,
				x: 100,
				y: Y.bust + 8,
				s: .75,
				fill: p.secondary,
				accent: p.accent
			}),
			nl === "Cowl" && /* @__PURE__ */ jsx(Line, {
				d: `M91 ${SH$1 + 2}Q100 ${SH$1 + 9} 109 ${SH$1 + 2}M88 ${SH$1 + 6}Q100 ${SH$1 + 15} 112 ${SH$1 + 6}`,
				w: .45,
				o: .55
			}),
			nl === "High neck" && /* @__PURE__ */ jsx(Fab, {
				p,
				fill: p.fabric2,
				d: `M${100 - b.neck - 1.5} ${Y.chin + 1}h${b.neck * 2 + 3}v4h-${b.neck * 2 + 3}z`
			}),
			strap && /* @__PURE__ */ jsx(Straps, {
				p,
				top: s.top
			}),
			/* @__PURE__ */ jsx(Sleeves, {
				p,
				kind: sleeves,
				cat: "tops",
				ease: Math.min(ease, 5) * .5
			}),
			(spec.attrs.Embellishment ?? "None").split(", ").map((e) => /* @__PURE__ */ jsx(Trim, {
				p,
				kind: e,
				top: s.top,
				hem: s.hem,
				region
			}, e)),
			/* @__PURE__ */ jsx(UpperSignature, {
				p,
				s,
				cat: "tops"
			})
		]
	});
}
//#endregion
//#region app/components/garments/bags.tsx
/**
* Bags. Labels: bags.type.<x>, bags.shape.<x>, bags.structure.<x>, bags.handle-strap.<x>,
* bags.details.<x>, bags.signature.<x>, bags.flap
*/
var SIZE_SCALE = [
	.75,
	.92,
	1.1,
	1.28,
	1.6,
	2
];
/** Strap anchor height on the shoulder. */
var SHY = Y.shoulder - 1;
var BASE = {
	Clutch: [26, 12],
	Tote: [28, 26],
	Minaudière: [15, 13],
	"Bucket bag": [18, 22],
	"Belt bag": [20, 10],
	Backpack: [26, 30],
	"Mini bag": [16, 12],
	"Hobo bag": [30, 18]
};
function placeFor(type, handle) {
	if (type === "Backpack") return "back";
	if (type === "Belt bag") return "waist";
	if (type === "Tote") return handle === "Top handle" ? "elbow" : "hip";
	if (type === "Crossbody" || handle === "Crossbody strap") return "cross";
	if ([
		"Clutch",
		"Minaudière",
		"Top-handle bag"
	].includes(type) || [
		"Top handle",
		"Wristlet",
		"No handle"
	].includes(handle)) return "hand";
	return "hip";
}
/** Bag body outline centered on (0,0). */
function bagShape(shape, w, h, slouch) {
	const W = w / 2;
	const H = h / 2;
	const sag = slouch ? H * .35 : 0;
	switch (shape) {
		case "Square": return curve([
			pt(-H, -H, true),
			pt(H, -H, true),
			pt(H, H, true),
			pt(0, H + sag),
			pt(-H, H, true)
		]);
		case "Round":
		case "Spherical": return `M${-H} 0a${H} ${H} 0 1 0 ${h} 0a${H} ${H} 0 1 0 ${-h} 0Z`;
		case "Oval": return `M${-W} 0a${W} ${H} 0 1 0 ${w} 0a${W} ${H} 0 1 0 ${-w} 0Z`;
		case "Crescent": return curve([
			pt(-W, -H * .6, true),
			pt(0, -H * .1),
			pt(W, -H * .6, true),
			pt(W * .6, H * .6),
			pt(0, H + sag),
			pt(-W * .6, H * .6)
		]);
		case "Geometric": return `M${-W * .5} ${-H}L${W * .5} ${-H}L${W} 0L${W * .5} ${H}L${-W * .5} ${H}L${-W} 0Z`;
		case "Organic": return curve([
			pt(-W * .8, -H),
			pt(W * .4, -H * 1.1),
			pt(W, -H * .2),
			pt(W * .7, H),
			pt(-W * .3, H * 1.05 + sag),
			pt(-W, H * .3)
		]);
		case "Abstract": return `M${-W} ${-H * .4}L${W * .2} ${-H}L${W} ${-H * .2}L${W * .6} ${H}L${-W * .7} ${H * .8}Z`;
		case "Animal-shaped": return curve([
			pt(-W, -H * .2),
			pt(-W * .9, -H * 1.4, true),
			pt(-W * .35, -H * .8),
			pt(W * .35, -H * .8),
			pt(W * .9, -H * 1.4, true),
			pt(W, -H * .2),
			pt(W * .8, H * .8),
			pt(0, H),
			pt(-W * .8, H * .8)
		]);
		default: return curve([
			pt(-W, -H, true),
			pt(W, -H, true),
			pt(W, H, true),
			pt(0, H + sag),
			pt(-W, H, true)
		]);
	}
}
function Bag({ p, part }) {
	const { b, spec, item } = p;
	const handle = attr(spec, "Handle / Strap");
	const place = placeFor(item.type, handle);
	if (part === "back" && place !== "back") return null;
	if (part === "front" && place === "back") return /* @__PURE__ */ jsx(BackpackStraps, { p });
	const [bw, bh] = BASE[item.type] ?? [22, 17];
	const k = SIZE_SCALE[item.size] ?? 1;
	const w = bw * k;
	const h = bh * k;
	const shape = item.type === "Hobo bag" && attr(spec, "Shape") === "Rectangular" ? "Crescent" : attr(spec, "Shape");
	const structure = attr(spec, "Structure");
	const slouch = structure === "Slouchy" || item.type === "Hobo bag";
	const rWrist = armAt(b, -1, 1);
	const hipX = 100 + Math.max(b.hip, torsoHalf(b, Y.hip + 6), b.wrist - 4) + 3 + w / 2;
	const at = {
		hand: {
			x: rWrist.x - 2,
			y: rWrist.y + 10 + h / 2
		},
		hip: {
			x: hipX,
			y: Y.hip + 8
		},
		cross: {
			x: 100 + torsoHalf(b, Y.hip) + w * .35,
			y: Y.hip
		},
		elbow: {
			x: armAt(b, 1, .6).x + 4,
			y: armAt(b, 1, .6).y + h / 2 + 8
		},
		waist: {
			x: 110,
			y: Y.waist + 10
		},
		back: {
			x: 100 + b.shoulder - 2,
			y: Y.bust + 22
		}
	}[place];
	const body = bagShape(shape, w, h, slouch);
	const alpha = structure === "Transparent" || attr(spec, "Material") === "Transparent PVC" ? .45 : p.alpha;
	const chain = handle === "Chain strap";
	const strapStroke = (d, key) => chain ? /* @__PURE__ */ jsx(Chain, {
		d,
		c: p.metal
	}, key) : /* @__PURE__ */ jsxs("g", { children: [/* @__PURE__ */ jsx("path", {
		d,
		stroke: INK,
		strokeWidth: 2.3,
		fill: "none",
		strokeLinecap: "round"
	}), /* @__PURE__ */ jsx("path", {
		d,
		stroke: p.secondary,
		strokeWidth: 1.4,
		fill: "none",
		strokeLinecap: "round"
	})] }, key);
	let strap = null;
	const top = at.y - h / 2;
	if (place === "hip") strap = strapStroke(`M${100 + b.shoulder - 6} ${SHY}Q${at.x - w * .3} ${(SHY + top) / 2} ${at.x - w * .25} ${top + 1}M${100 + b.shoulder - 6} ${SHY}Q${at.x + w * .1} ${(SHY + top) / 2 - 10} ${at.x + w * .25} ${top + 1}`, "s");
	if (place === "cross") strap = strapStroke(`M${100 - b.shoulder + 6} ${SHY}L${at.x} ${top + 1}`, "s");
	if (place === "hand" && (handle === "Top handle" || item.type === "Top-handle bag" || item.type === "Bucket bag")) strap = strapStroke(`M${at.x - w * .28} ${top + 1}Q${at.x} ${top - h * .9 - 4} ${at.x + w * .28} ${top + 1}`, "s");
	if (place === "hand" && (handle === "Wristlet" || handle === "Chain strap")) strap = strapStroke(`M${at.x - 3} ${top + 1}Q${rWrist.x - 4} ${rWrist.y - 2} ${rWrist.x + 4} ${rWrist.y + 2}`, "s");
	if (place === "elbow") strap = strapStroke(`M${at.x - w * .3} ${top + 1}Q${at.x - 2} ${top - 16} ${at.x + w * .3} ${top + 1}`, "s");
	if (place === "waist") strap = strapStroke(`M${100 - torsoHalf(b, Y.waist) - 1} ${Y.waist + 2}Q100 ${Y.waist + 6} ${100 + torsoHalf(b, Y.waist) + 1} ${Y.waist + 2}`, "s");
	if (handle === "Multiple straps" && place !== "waist") strap = /* @__PURE__ */ jsxs(Fragment, { children: [strap, strapStroke(`M${at.x - w * .35} ${top + 1}Q${at.x} ${top - 12} ${at.x + w * .35} ${top + 1}`, "m")] });
	const details = (spec.attrs.Details ?? "None").split(", ").filter((d) => d !== "None");
	const flap = [
		"Shoulder bag",
		"Crossbody",
		"Clutch",
		"Mini bag",
		"Belt bag"
	].includes(item.type) && ![
		"Round",
		"Spherical",
		"Animal-shaped"
	].includes(shape);
	return /* @__PURE__ */ jsxs(Art, {
		k: `bags.type.${item.type.toLowerCase().replace(/\s+/g, "-")}`,
		children: [strap && /* @__PURE__ */ jsx(Art, {
			k: artKey("bags", "handle-strap", handle),
			children: strap
		}), /* @__PURE__ */ jsxs("g", {
			transform: `translate(${at.x} ${at.y})`,
			children: [
				/* @__PURE__ */ jsx(Fab, {
					p,
					k: artKey("bags", "shape", shape),
					d: body,
					alpha
				}),
				structure === "Transparent" && /* @__PURE__ */ jsx(Fab, {
					p,
					k: "bags.structure.transparent.pouch",
					fill: p.fabric2,
					d: bagShape("Rectangular", w * .6, h * .5, false)
				}),
				structure === "Quilted" && /* @__PURE__ */ jsxs(Art, {
					k: "bags.structure.quilted",
					children: [/* @__PURE__ */ jsx("clipPath", {
						id: `${p.uid}-bagclip`,
						children: /* @__PURE__ */ jsx("path", { d: body })
					}), /* @__PURE__ */ jsx("g", {
						clipPath: `url(#${p.uid}-bagclip)`,
						children: /* @__PURE__ */ jsx(Line, {
							d: Array.from({ length: 8 }, (_, i) => `M${-w + i * 6} ${-h}l${h * 2} ${h * 2}M${w - i * 6} ${-h}l${-h * 2} ${h * 2}`).join(""),
							w: .6,
							o: .45
						})
					})]
				}),
				shape === "Spherical" && /* @__PURE__ */ jsx("path", {
					d: `M${-h * .35} ${-h * .25}a${h * .3} ${h * .18} -30 0 1 ${h * .3} -${h * .12}`,
					stroke: "#fff",
					strokeWidth: 1.6,
					fill: "none"
				}),
				shape === "Animal-shaped" && /* @__PURE__ */ jsxs(Art, {
					k: "bags.shape.animal-shaped.face",
					children: [
						/* @__PURE__ */ jsx("circle", {
							cx: -w * .18,
							cy: 0,
							r: 1.2,
							fill: "#2b1b33"
						}),
						/* @__PURE__ */ jsx("circle", {
							cx: w * .18,
							cy: 0,
							r: 1.2,
							fill: "#2b1b33"
						}),
						/* @__PURE__ */ jsx("path", {
							d: `M-1.5 ${h * .12}l1.5 1.2 1.5-1.2M${-w * .45} ${h * .15}l${-w * .25} -1M${w * .45} ${h * .15}l${w * .25} -1`,
							stroke: "#2b1b33",
							strokeWidth: .6,
							fill: "none"
						})
					]
				}),
				(structure === "Rigid" || item.type === "Minaudière") && /* @__PURE__ */ jsx(Line, {
					d: `M${-w / 2 + 1} ${-h / 2 + 1.5}H${w / 2 - 1}`,
					c: p.metal,
					w: 1.8,
					o: 1
				}),
				flap && /* @__PURE__ */ jsxs(Art, {
					k: "bags.flap",
					children: [/* @__PURE__ */ jsx(Fab, {
						p,
						fill: p.fabric2,
						riso: false,
						d: curve([
							pt(-w / 2, -h / 2, true),
							pt(w / 2, -h / 2, true),
							pt(w / 2, -h * .05, true),
							pt(0, h * .2),
							pt(-w / 2, -h * .05, true)
						])
					}), p.spec.signature !== "Motif clasp" && p.spec.signature !== "Crystal clasp" && /* @__PURE__ */ jsx("circle", {
						cx: 0,
						cy: h * .15,
						r: 1.5,
						fill: p.metal,
						stroke: "#2b1b33",
						strokeWidth: .5
					})]
				}),
				details.map((d) => /* @__PURE__ */ jsx(BagDetail, {
					p,
					kind: d,
					w,
					h
				}, d)),
				/* @__PURE__ */ jsx(BagSignature, {
					p,
					w,
					h
				})
			]
		})]
	});
}
function BagDetail({ p, kind, w, h }) {
	const k = artKey("bags", "details", kind);
	switch (kind) {
		case "Crystals": return /* @__PURE__ */ jsx(Art, {
			k,
			children: [
				[-.25, -.1],
				[.2, .15],
				[0, .3],
				[.3, -.25]
			].map(([x, y], i) => /* @__PURE__ */ jsx("circle", {
				cx: x * w,
				cy: y * h,
				r: .9,
				fill: "#fff",
				stroke: INK,
				strokeWidth: .3
			}, i))
		});
		case "Pearls": return /* @__PURE__ */ jsx(Art, {
			k,
			children: Array.from({ length: 7 }, (_, i) => /* @__PURE__ */ jsx(Bead, {
				x: -w / 2 + 2 + i * (w - 4) / 6,
				y: -h / 2 + 1,
				r: 1.1,
				c: "#fbf6ee"
			}, i))
		});
		case "Chains": return /* @__PURE__ */ jsx(Art, {
			k,
			children: /* @__PURE__ */ jsx(Chain, {
				d: `M${-w / 2 + 2} ${-h * .1}Q0 ${h * .45} ${w / 2 - 2} ${-h * .1}`,
				c: p.metal,
				w: 1
			})
		});
		case "Charms": return /* @__PURE__ */ jsxs(Art, {
			k,
			children: [/* @__PURE__ */ jsx(Line, {
				d: `M${w * .35} ${-h / 2}v6`,
				c: p.metal,
				o: 1,
				w: .7
			}), /* @__PURE__ */ jsx(MotifArt, {
				kind: p.spec.motif,
				x: w * .35,
				y: -h / 2 + 9,
				s: .3,
				fill: p.accent,
				accent: p.metal
			})]
		});
		case "Embroidery": return /* @__PURE__ */ jsx(Art, {
			k,
			children: /* @__PURE__ */ jsx(MotifArt, {
				kind: p.spec.motif,
				x: 0,
				y: h * .2,
				s: Math.min(w, h) * .03,
				fill: p.metal,
				accent: p.accent
			})
		});
		case "Fringe": return /* @__PURE__ */ jsx(Art, {
			k,
			children: Array.from({ length: 9 }, (_, i) => /* @__PURE__ */ jsx("path", {
				d: `M${-w / 2 + 2 + i * (w - 4) / 8} ${h / 2}v${6 + i % 2 * 2}`,
				stroke: p.secondary,
				strokeWidth: .9
			}, i))
		});
		case "Feathers": return /* @__PURE__ */ jsx(Art, {
			k,
			children: /* @__PURE__ */ jsx(Fluff, {
				d: `M${-w / 2} ${-h / 2}H${w / 2}`,
				c: p.light,
				w: 4,
				gap: 3
			})
		});
		case "Spikes": return /* @__PURE__ */ jsx(Art, {
			k,
			children: Array.from({ length: 5 }, (_, i) => /* @__PURE__ */ jsx("path", {
				d: `M${-w / 2 + 3 + i * ((w - 6) / 4) - 1.5} ${h / 2 - 1}l1.5-4 1.5 4z`,
				fill: p.metal,
				stroke: INK,
				strokeWidth: .4
			}, i))
		});
		case "Sculptural hardware": return /* @__PURE__ */ jsxs(Art, {
			k,
			children: [/* @__PURE__ */ jsx("circle", {
				cx: 0,
				cy: -h / 2 - 3,
				r: 4,
				fill: "none",
				stroke: INK,
				strokeWidth: 2.6
			}), /* @__PURE__ */ jsx("circle", {
				cx: 0,
				cy: -h / 2 - 3,
				r: 4,
				fill: "none",
				stroke: p.metal,
				strokeWidth: 1.6
			})]
		});
		default: return null;
	}
}
function BagSignature({ p, w, h }) {
	const sig = p.spec.signature;
	const k = `bags.signature.${sig.toLowerCase().replace(/\s+/g, "-")}`;
	switch (sig) {
		case "Motif charm": return /* @__PURE__ */ jsxs(Art, {
			k,
			children: [/* @__PURE__ */ jsx(Line, {
				d: `M${-w * .3} ${-h / 2}v7`,
				c: p.metal,
				o: 1,
				w: .8
			}), /* @__PURE__ */ jsx(MotifArt, {
				kind: p.spec.motif,
				x: -w * .3,
				y: -h / 2 + 12,
				s: .45,
				fill: p.accent,
				accent: p.metal
			})]
		});
		case "Oversized bow": return /* @__PURE__ */ jsx(Art, {
			k,
			children: /* @__PURE__ */ jsx(MotifArt, {
				kind: "bow",
				x: 0,
				y: -h / 2,
				s: .5 + w * .012,
				fill: p.secondary,
				accent: p.accent
			})
		});
		case "Crystal clasp": return /* @__PURE__ */ jsx(Art, {
			k,
			children: /* @__PURE__ */ jsx(MotifArt, {
				kind: "gem",
				x: 0,
				y: h * .1,
				s: .35,
				fill: p.accent,
				filter: `url(#${p.uid}-glow)`
			})
		});
		case "Motif clasp": return /* @__PURE__ */ jsx(Art, {
			k,
			children: /* @__PURE__ */ jsx(MotifArt, {
				kind: p.spec.motif,
				x: 0,
				y: h * .12,
				s: .38,
				fill: p.metal,
				accent: p.accent
			})
		});
		case "Fringe curtain": return /* @__PURE__ */ jsx(Art, {
			k,
			children: Array.from({ length: 13 }, (_, i) => /* @__PURE__ */ jsx("path", {
				d: `M${-w / 2 + 1 + i * (w - 2) / 12} ${h / 2}v${12 + i % 3 * 3}`,
				stroke: p.secondary,
				strokeWidth: 1
			}, i))
		});
		case "Tassel": return /* @__PURE__ */ jsxs(Art, {
			k,
			children: [/* @__PURE__ */ jsx(Line, {
				d: `M${w / 2 - 2} ${-h / 2 + 2}v5`,
				c: p.metal,
				o: 1,
				w: .8
			}), /* @__PURE__ */ jsx("path", {
				d: `M${w / 2 - 4} ${-h / 2 + 7}h4l1 9h-6z`,
				fill: p.secondary,
				stroke: INK,
				strokeWidth: .6
			})]
		});
		default: return null;
	}
}
function BackpackStraps({ p }) {
	const { b } = p;
	return /* @__PURE__ */ jsx(Art, {
		k: "bags.type.backpack.straps",
		children: [-1, 1].map((s) => {
			const d = `M${100 + s * (b.neck + 5)} ${SHY - 2}Q${100 + s * (b.bust - 4)} ${Y.bust + 10} ${100 + s * (torsoHalf(b, Y.underbust + 18) - 1)} ${Y.underbust + 18}`;
			return /* @__PURE__ */ jsxs("g", { children: [/* @__PURE__ */ jsx("path", {
				d,
				stroke: INK,
				strokeWidth: 3.4,
				fill: "none",
				strokeLinecap: "round"
			}), /* @__PURE__ */ jsx("path", {
				d,
				stroke: p.secondary,
				strokeWidth: 2.3,
				fill: "none",
				strokeLinecap: "round"
			})] }, s);
		})
	});
}
//#endregion
//#region app/components/garments/bottoms.tsx
/**
* Bottoms. Labels: bottoms.type.<x>, bottoms.fit-silhouette.<x>, bottoms.waistline.<x>,
* bottoms.leg-hem-design.<x>, bottoms.construction.<x>, bottoms.details.<x>, bottoms.signature.<x>
*/
var SKIRTS = [
	"Mini skirt",
	"Midi skirt",
	"Maxi skirt",
	"Pencil skirt",
	"Pleated skirt"
];
var waistY = () => ({
	"Low-rise": Y.highHip + 8,
	"Mid-rise": Y.highHip - 4,
	"High-rise": Y.waist + 2,
	"Ultra-high-rise": Y.waist - 14,
	Asymmetrical: Y.waist + 2
});
var WAIST_Y = waistY();
onTune(() => Object.assign(WAIST_Y, waistY()));
var SKIRT_HEM = [
	Y.crotch + 6,
	LEN.mini,
	LEN.aboveKnee,
	LEN.knee,
	LEN.midi,
	LEN.ankle,
	LEN.floor,
	Y.floor + 6
];
var PANT_HEM = [
	Y.crotch + 12,
	Y.crotch + 24,
	LEN.aboveKnee,
	LEN.knee,
	LEN.midi,
	LEN.ankle,
	LEN.floor,
	Y.floor + 6
];
onTune(() => {
	SKIRT_HEM = [
		Y.crotch + 6,
		LEN.mini,
		LEN.aboveKnee,
		LEN.knee,
		LEN.midi,
		LEN.ankle,
		LEN.floor,
		Y.floor + 6
	];
	PANT_HEM = [
		Y.crotch + 12,
		Y.crotch + 24,
		LEN.aboveKnee,
		LEN.knee,
		LEN.midi,
		LEN.ankle,
		LEN.floor,
		Y.floor + 6
	];
});
var smooth = (t) => {
	const u = Math.max(0, Math.min(1, t));
	return u * u * (3 - 2 * u);
};
function Bottoms({ p, part }) {
	if (part === "back") return null;
	return SKIRTS.includes(p.item.type) ? /* @__PURE__ */ jsx(Skirt, { p }) : /* @__PURE__ */ jsx(Pants, { p });
}
function waistFor(p) {
	const wl = attr(p.spec, "Waistline");
	const wy = WAIST_Y[wl] ?? WAIST_Y["Mid-rise"];
	return {
		wyR: wl === "Asymmetrical" ? WAIST_Y["High-rise"] : wy,
		wyL: wl === "Asymmetrical" ? WAIST_Y["Low-rise"] : wy
	};
}
function Waistband({ p, wyL, wyR, side }) {
	const l = side(wyL);
	const r = side(wyR);
	const d = `M${100 - l - .4} ${wyL - .4}L${100 + r + .4} ${wyR - .4}L${100 + side(wyR + 5) + .4} ${wyR + 4.4}L${100 - side(wyL + 5) - .4} ${wyL + 4.4}Z`;
	return /* @__PURE__ */ jsx(Fab, {
		p,
		k: "bottoms.waistband",
		d,
		fill: p.fabric2,
		wash: false
	});
}
function Details({ p, side, wy, hemY, legs }) {
	const list = (p.spec.attrs.Details ?? "None").split(", ").filter((d) => d !== "None");
	const region = {
		y0: wy + 8,
		y1: hemY - 4,
		w: side
	};
	return /* @__PURE__ */ jsx(Fragment, { children: list.map((d) => {
		const k = artKey("bottoms", "details", d);
		switch (d) {
			case "Pockets": return /* @__PURE__ */ jsxs(Art, {
				k,
				children: [/* @__PURE__ */ jsx(Line, {
					d: [-1, 1].map((s) => `M${100 + s * (side(wy + 3) - 8)} ${wy + 5}Q${100 + s * (side(wy + 13) - 3)} ${wy + 8} ${100 + s * side(wy + 18)} ${wy + 18}`).join(""),
					w: .55,
					o: .75
				}), legs && p.item.type === "Cargo pants" && [-1, 1].map((s) => {
					const x = 100 + s * (torsoHalf(p.b, Y.thigh + 14) - 5);
					return /* @__PURE__ */ jsx(Fab, {
						p,
						fill: p.fabric2,
						d: `M${x - 6} ${Y.thigh + 4}h12v15h-12z`,
						wash: false
					}, s);
				})]
			}, d);
			case "Straps": return /* @__PURE__ */ jsx(Art, {
				k,
				children: [-1, 1].map((s) => {
					const y = Math.min(hemY - 7, Y.thigh + 4);
					const x = 100 + s * ((torsoHalf(p.b, y) + legInnerAt(p.b, y)) / 2);
					return /* @__PURE__ */ jsxs("g", { children: [
						/* @__PURE__ */ jsx("path", {
							d: `M${x - 9} ${y}l18 2.4`,
							stroke: INK,
							strokeWidth: 2.6
						}),
						/* @__PURE__ */ jsx("path", {
							d: `M${x - 9} ${y}l18 2.4`,
							stroke: p.secondary,
							strokeWidth: 1.6
						}),
						/* @__PURE__ */ jsx("rect", {
							x: x - 1.6,
							y: y - .8,
							width: 3.2,
							height: 3.6,
							fill: "none",
							stroke: p.metal,
							strokeWidth: .7
						})
					] }, s);
				})
			}, d);
			case "Buckles": return /* @__PURE__ */ jsxs(Art, {
				k,
				children: [/* @__PURE__ */ jsx("rect", {
					x: 96,
					y: wy - 1,
					width: 8,
					height: 6.5,
					rx: 1.2,
					fill: "none",
					stroke: INK,
					strokeWidth: 1.9
				}), /* @__PURE__ */ jsx("rect", {
					x: 96,
					y: wy - 1,
					width: 8,
					height: 6.5,
					rx: 1.2,
					fill: "none",
					stroke: p.metal,
					strokeWidth: 1.1
				})]
			}, d);
			case "Chains": return /* @__PURE__ */ jsx(Art, {
				k,
				children: /* @__PURE__ */ jsx(Chain, {
					d: `M${100 - side(wy + 5)} ${wy + 5}Q95 ${wy + 27} ${100 + side(wy + 11) - 3} ${wy + 13}`,
					c: p.metal
				})
			}, d);
			case "Lacing": return /* @__PURE__ */ jsx(Art, {
				k,
				children: [-1, 1].map((s) => /* @__PURE__ */ jsx(Lacing, {
					x: 100 + s * (side(wy + 24) - 2.5),
					y0: wy + 8,
					y1: Math.min(hemY - 5, wy + 56),
					w: 1.8,
					c: p.secondary
				}, s))
			}, d);
			case "Cutouts": return null;
			default: return /* @__PURE__ */ jsx(Trim, {
				p,
				kind: d,
				region,
				hem: [
					pt(100 - side(hemY), hemY),
					pt(100, hemY + 2),
					pt(100 + side(hemY), hemY)
				]
			}, d);
		}
	}) });
}
function holes(p, side, hemY, legs) {
	const list = [];
	if ((p.spec.attrs.Details ?? "").includes("Cutouts")) for (const s of [-1, 1]) {
		const y = Math.min(hemY - 12, Y.thigh);
		const x = 100 + s * ((torsoHalf(p.b, y) + legInnerAt(p.b, y)) / 2);
		list.push(/* @__PURE__ */ jsx("ellipse", {
			cx: x,
			cy: y,
			rx: 3.2,
			ry: 6
		}, `c${s}`));
	}
	if (attr(p.spec, "Leg / Hem Design") === "Slit" || attr(p.spec, "Construction") === "Split" || attr(p.spec, "Rise / Coverage") === "Low coverage") {
		const s = legs ? 1 : -1;
		const h = legs ? 13 : Math.min(34, (hemY - Y.hip) * .5);
		const x = legs ? 100 + side(hemY) - 3 : 100 + s * side(hemY) * .5;
		list.push(/* @__PURE__ */ jsx("path", { d: `M${x - 2.4} ${hemY + 4}L${x} ${hemY - h}L${x + 2.4} ${hemY + 4}Z` }, "slit"));
	}
	if (!list.length) return null;
	return /* @__PURE__ */ jsxs("mask", {
		id: `${p.uid}-cut`,
		maskUnits: "userSpaceOnUse",
		x: -200,
		y: -100,
		width: 600,
		height: 600,
		children: [/* @__PURE__ */ jsx("rect", {
			x: -200,
			y: -100,
			width: 600,
			height: 600,
			fill: "#fff"
		}), /* @__PURE__ */ jsx("g", {
			fill: "#000",
			children: list
		})]
	});
}
function BottomSignature({ p, side, wy, hemY, hem }) {
	const sig = p.spec.signature;
	const k = `bottoms.signature.${slug(sig)}`;
	switch (sig) {
		case "Lace-up sides": return /* @__PURE__ */ jsx(Art, {
			k,
			children: [-1, 1].map((s) => /* @__PURE__ */ jsx(Lacing, {
				x: 100 + s * (side(wy + 24) - 2),
				y0: wy + 5,
				y1: Math.min(hemY - 4, wy + 64),
				w: 2,
				c: p.metal
			}, s))
		});
		case "Oversized belt": return /* @__PURE__ */ jsxs(Art, {
			k,
			children: [/* @__PURE__ */ jsx(Fab, {
				p,
				fill: p.secondary,
				d: `M${100 - side(wy) - 2} ${wy - 2}L${100 + side(wy) + 2} ${wy - 2}L${100 + side(wy + 8) + 2} ${wy + 7}L${100 - side(wy + 8) - 2} ${wy + 7}Z`
			}), /* @__PURE__ */ jsx(MotifArt, {
				kind: p.spec.motif,
				x: 100,
				y: wy + 2.5,
				s: .55,
				fill: p.metal,
				accent: p.accent
			})]
		});
		case "Chain drape": return /* @__PURE__ */ jsxs(Art, {
			k,
			children: [/* @__PURE__ */ jsx(Chain, {
				d: `M${100 - side(wy + 3)} ${wy + 3}Q100 ${wy + 24} ${100 + side(wy + 3)} ${wy + 3}`,
				c: p.metal
			}), /* @__PURE__ */ jsx(Chain, {
				d: `M${100 - side(wy + 6)} ${wy + 6}Q100 ${wy + 36} ${100 + side(wy + 6)} ${wy + 6}`,
				c: p.metal
			})]
		});
		case "Ruffle hem": return hem.length > 1 ? /* @__PURE__ */ jsx(Eyelet, {
			p,
			pts: hem,
			size: 3.4,
			k,
			color: p.light
		}) : null;
		case "Motif patch": return /* @__PURE__ */ jsx(Art, {
			k,
			children: /* @__PURE__ */ jsx(MotifArt, {
				kind: p.spec.motif,
				x: 100 - side(wy + 32) * .5,
				y: Math.min(hemY - 10, wy + 36),
				s: .6,
				fill: p.accent,
				accent: p.secondary
			})
		});
		case "Contrast cuffs": return hem.length > 1 ? /* @__PURE__ */ jsxs(Art, {
			k,
			children: [/* @__PURE__ */ jsx("path", {
				d: curve(hem, false),
				stroke: INK,
				strokeWidth: 5.8,
				fill: "none"
			}), /* @__PURE__ */ jsx("path", {
				d: curve(hem, false),
				stroke: p.secondary,
				strokeWidth: 4.4,
				fill: "none"
			})]
		}) : null;
		default: return null;
	}
}
function Skirt({ p }) {
	const { b, spec, item } = p;
	const fit = attr(spec, "Fit / Silhouette");
	const { wyL, wyR } = waistFor(p);
	const wy = Math.min(wyL, wyR);
	const hemY = SKIRT_HEM[item.size] ?? LEN.knee;
	const flare = [
		.7,
		1,
		1.4,
		1.9
	][p.ex];
	const body = (y) => torsoHalf(b, y);
	let side;
	if (item.type === "Pencil skirt" || ["Skinny", "Slim"].includes(fit)) side = (y) => body(y) + 1.2;
	else if (fit === "Straight") side = (y) => y < Y.hip ? body(y) + 1.6 : b.hip + 1.6;
	else if (fit === "Balloon") side = (y) => body(y) + 2.5 + (8 + 3.5 * p.ex) * Math.sin(Math.PI * smooth((y - wy) / Math.max(20, hemY - wy)));
	else if (fit === "Tapered") side = (y) => Math.max(body(y) + 1.2, b.hip + 5 - Math.max(0, y - Y.hip) * .12);
	else if (fit === "Sculptural") side = (y) => body(y) + 2 + (13 + 8 * p.ex) * Math.exp(-Math.pow((y - Y.hip) / 20, 2));
	else if (fit === "Flared" || fit === "Bell-bottom") side = (y) => Math.max(body(y) + 2.5, b.highHip + Math.max(0, y - wy) * .45 * flare);
	else side = (y) => Math.max(body(y) + 2, b.highHip + 1.6 + Math.max(0, y - Y.highHip) * .3 * flare);
	const coverage = attr(spec, "Rise / Coverage");
	const asym = attr(spec, "Leg / Hem Design") === "Asymmetrical" || coverage === "Asymmetric" || spec.universal.Symmetry === "Mismatched";
	const trailing = item.size === 7 || attr(spec, "Leg / Hem Design") === "Trailing";
	const hemR = hemY;
	const hemL = asym ? Math.max(wy + 28, hemY - 34) : hemY;
	const cd = Math.min(5, side(hemY) * .08);
	const half = (w0, hy) => {
		const out = [pt(0, w0 + 1), pt(side(w0), w0, true)];
		const n = Math.max(2, Math.round((hy - w0) / 8));
		for (let i = 1; i <= n; i++) {
			const y = w0 + (hy - w0) * i / n;
			out.push(pt(side(y) + (trailing && i === n ? 7 : 0), y, i === n));
		}
		out.push(pt(side(hy) * .5, hy + cd * .75), pt(0, hy + cd));
		return out;
	};
	const { d } = joinHalves(half(wyR, hemR), half(wyL, hemL));
	const hem = Array.from({ length: 13 }, (_, i) => {
		const u = i / 12;
		const x = -1 + 2 * u;
		const y = hemL + (hemR - hemL) * u + cd * (1 - x * x);
		return pt(100 + x * side(hemL + (hemR - hemL) * u), y);
	});
	const construction = attr(spec, "Construction");
	const mask = holes(p, side, hemY, false);
	const clip = `url(#${p.uid}-clip)`;
	const mat = attr(spec, "Material");
	const soft = ![
		"Leather",
		"Latex",
		"Denim",
		"Metallic fabric"
	].includes(mat);
	return /* @__PURE__ */ jsxs(Art, {
		k: `bottoms.type.${slug(item.type)}`,
		children: [
			/* @__PURE__ */ jsxs("defs", { children: [/* @__PURE__ */ jsx("clipPath", {
				id: `${p.uid}-clip`,
				children: /* @__PURE__ */ jsx("path", { d })
			}), mask] }),
			/* @__PURE__ */ jsxs("g", {
				mask: mask ? `url(#${p.uid}-cut)` : void 0,
				children: [
					/* @__PURE__ */ jsx(Fab, {
						p,
						d,
						k: artKey("bottoms", "fit-silhouette", fit),
						alpha: p.alphaMixed
					}),
					soft && hemY - wy > 30 && /* @__PURE__ */ jsx(Art, {
						k: "bottoms.folds",
						clipPath: clip,
						children: /* @__PURE__ */ jsx(Line, {
							d: Array.from({ length: 5 + p.density }, (_, i) => {
								const u = (i + .5) / (5 + p.density) - .5;
								const yEnd = wy + (hemY - wy) * (.6 + i * 29 % 10 / 25);
								return `M${100 + u * 1.6 * side(wy + 6)} ${wy + 8}C${100 + u * 1.6 * side(wy + 6) + 2} ${(wy + yEnd) / 2} ${100 + u * 1.9 * side(yEnd) - 2} ${(wy + yEnd) / 2 + 8} ${100 + u * 1.9 * side(yEnd)} ${yEnd}`;
							}).join(""),
							w: .38,
							o: .42
						})
					}),
					(construction === "Pleated" || item.type === "Pleated skirt") && /* @__PURE__ */ jsx(Art, {
						k: "bottoms.construction.pleated",
						clipPath: clip,
						children: /* @__PURE__ */ jsx(Line, {
							d: Array.from({ length: 9 + p.density * 2 }, (_, i) => {
								const u = (i + .5) / (9 + p.density * 2) - .5;
								return `M${100 + u * 2 * side(wy + 5)} ${wy + 3}L${100 + u * 2 * side(hemY)} ${hemY + 7}`;
							}).join(""),
							w: .45,
							o: .6
						})
					}),
					construction === "Tiered" && /* @__PURE__ */ jsx(Art, {
						k: "bottoms.construction.tiered",
						clipPath: clip,
						children: [.35, .68].map((u, i) => {
							const y = wy + (hemY - wy) * u;
							return /* @__PURE__ */ jsx("path", {
								d: `M30 ${y}Q100 ${y + 5} 170 ${y}V${hemY + 10}H30Z`,
								fill: i ? p.fabric2 : p.fabric,
								fillOpacity: .5,
								stroke: "#2b1b33",
								strokeWidth: .55
							}, i);
						})
					}),
					construction === "Wrapped" && /* @__PURE__ */ jsxs(Art, {
						k: "bottoms.construction.wrapped",
						children: [/* @__PURE__ */ jsx("g", {
							clipPath: clip,
							children: /* @__PURE__ */ jsx(Line, {
								d: `M${100 + side(wy) - 2.5} ${wy + 2}Q103 ${(wy + hemY) / 2} ${100 - side(hemY) * .4} ${hemY + 5}`,
								w: .7,
								o: .8
							})
						}), /* @__PURE__ */ jsx(MotifArt, {
							kind: "bow",
							x: 100 + side(wy) - 2,
							y: wy + 4,
							s: .42,
							fill: p.secondary,
							accent: p.accent
						})]
					}),
					(construction === "Ruched" || construction === "Draped" || construction === "Paneled" || construction === "Deconstructed") && /* @__PURE__ */ jsx(Art, {
						k: artKey("bottoms", "construction", construction),
						clipPath: clip,
						children: /* @__PURE__ */ jsx(Line, {
							d: construction === "Paneled" ? `M93 ${wy}L${100 - side(hemY) * .4} ${hemY + 5}M107 ${wy}L${100 + side(hemY) * .4} ${hemY + 5}` : construction === "Deconstructed" ? `M76 ${wy + 8}L124 ${hemY - 8}` : Array.from({ length: 6 }, (_, i) => {
								const y = wy + 7 + i * ((hemY - wy - 9) / 6);
								return construction === "Ruched" ? `M${100 - side(y) * .7} ${y}Q100 ${y + 4} ${100 + side(y) * .7} ${y}` : `M${100 - side(y)} ${y}Q100 ${y + 11} ${100 + side(y) * .6} ${y + 21}`;
							}).join(""),
							w: .45,
							o: .55,
							dash: construction === "Deconstructed" ? "1.6 1.2" : void 0
						})
					}),
					coverage === "Layered" && /* @__PURE__ */ jsx(Fab, {
						p,
						k: "bottoms.rise-coverage.layered",
						fill: p.fabric2,
						alpha: .45,
						d: curve([
							pt(100 - side(wy) - 1, wy, true),
							pt(100 + side(wy) + 1, wy, true),
							pt(100 + side(wy + (hemY - wy) * .6) + 5, wy + (hemY - wy) * .6, true),
							pt(100, wy + (hemY - wy) * .6 + 5),
							pt(100 - side(wy + (hemY - wy) * .6) - 5, wy + (hemY - wy) * .6, true)
						])
					})
				]
			}),
			(mat === "Lace" || mat === "Tulle") && /* @__PURE__ */ jsx(Eyelet, {
				p,
				pts: hem,
				size: 3,
				k: "bottoms.hem.eyelet-lace"
			}),
			/* @__PURE__ */ jsx(Waistband, {
				p,
				wyL,
				wyR,
				side
			}),
			attr(spec, "Leg / Hem Design") === "Fringed" && /* @__PURE__ */ jsx(Trim, {
				p,
				kind: "Fringe",
				hem
			}),
			attr(spec, "Leg / Hem Design") === "Cuffed" && /* @__PURE__ */ jsx("path", {
				d: curve(hem, false),
				stroke: "#2b1b33",
				strokeWidth: 4,
				fill: "none",
				opacity: .25
			}),
			attr(spec, "Leg / Hem Design") === "Detachable" && /* @__PURE__ */ jsx(Line, {
				d: `M${100 - side(Y.knee - 8)} ${Y.knee - 8}Q100 ${Y.knee - 3} ${100 + side(Y.knee - 8)} ${Y.knee - 8}`,
				dash: "1.3 1",
				o: .75
			}),
			/* @__PURE__ */ jsx(Details, {
				p,
				side,
				wy,
				hemY,
				legs: false
			}),
			/* @__PURE__ */ jsx(BottomSignature, {
				p,
				side,
				wy,
				hemY,
				hem
			})
		]
	});
}
function Pants({ p }) {
	const { b, spec, item } = p;
	const fit = attr(spec, "Fit / Silhouette");
	const { wyL, wyR } = waistFor(p);
	const wy = Math.min(wyL, wyR);
	const hemDesign = attr(spec, "Leg / Hem Design");
	const hemY = PANT_HEM[item.size] ?? LEN.ankle;
	const asymHem = hemDesign === "Asymmetrical" || attr(spec, "Rise / Coverage") === "Asymmetric";
	const flare = [
		.7,
		1,
		1.4,
		1.9
	][p.ex];
	const crotch = item.type === "Harem pants" ? Math.min(hemY - 18, Y.knee - 10) : Y.crotch + 3;
	const nat = (y) => (torsoHalf(b, y) - legInnerAt(b, Math.max(y, Y.crotch + 1))) / 2;
	const mid = (y) => (torsoHalf(b, y) + legInnerAt(b, Math.max(y, Y.crotch + 1))) / 2;
	const legW = (y, hy) => {
		const t = Y.thigh;
		switch (fit) {
			case "Skinny": return nat(y) + 1;
			case "Slim": return nat(y) + 2;
			case "Straight": return Math.max(nat(y), nat(t)) + 2;
			case "Wide-leg": return nat(t) + 2.5 + Math.max(0, y - t) * .14 * flare;
			case "Baggy": return Math.max(nat(y), nat(t)) + 5.5;
			case "Flared": return y < Y.knee ? nat(y) + 1.6 : nat(y) + 1.6 + (y - Y.knee) * .26 * flare;
			case "Bell-bottom": return y < Y.knee ? nat(y) + 1.2 : nat(y) + 1.2 + (y - Y.knee) * .4 * flare;
			case "Balloon": return nat(y) + 1.2 + (6.5 + 2.5 * p.ex) * Math.sin(Math.PI * smooth((y - Y.crotch) / Math.max(20, hy - Y.crotch)));
			case "Tapered": return nat(y) + 1.2 + Math.max(0, 1 - (y - t) / Math.max(20, hy - t)) * 4;
			case "Sculptural": return nat(y) + 2.5 + (10 + 5 * p.ex) * Math.exp(-Math.pow((y - t) / 20, 2));
			default: return nat(y) + 2;
		}
	};
	const outerLeg = (y, hy) => mid(y) + legW(y, hy) + (hemDesign === "Flared" ? Math.max(0, y - (hy - 26)) * .22 : 0);
	const innerLeg = (y, hy) => Math.max(.3, mid(y) - legW(y, hy));
	const chaps = item.type === "Chaps";
	const leg = (w0, hy) => {
		const crY = Math.min(crotch, hy - 5);
		const outerAtCrotch = outerLeg(Math.max(crY, Y.crotch + 1), hy);
		const upper = (y) => Math.max(torsoHalf(b, y) + 1.6, outerAtCrotch * smooth((y - Y.waist) / Math.max(10, crY - Y.waist)));
		const pts = chaps ? [pt(torsoHalf(b, w0) - 8, w0 + 11, true), pt(upper(w0) + .4, w0, true)] : [pt(0, w0 + 1, true), pt(upper(w0) + .4, w0, true)];
		for (let y = w0 + 7; y < crY; y += 7) pts.push(pt(upper(y), y));
		const n = Math.max(2, Math.round((hy - crY) / 8));
		for (let i = 0; i <= n; i++) {
			const y = crY + (hy - crY) * i / n;
			pts.push(pt(outerLeg(y, hy) + (hemDesign === "Trailing" && i === n ? 5 : 0), y, i === n));
		}
		for (let i = n; i >= 0; i--) {
			const y = crY + (hy - crY) * i / n;
			pts.push(pt(innerLeg(y, hy) - (hemDesign === "Trailing" && i === n ? 1.6 : 0), y, i === n));
		}
		if (chaps) pts.push(pt(innerLeg(crY, hy) + 2.5, crY + 3, true));
		else pts.push(pt(.3, crY, true));
		return {
			pts,
			d: curve(pts.map((q) => ({
				...q,
				x: 100 + q.x
			})))
		};
	};
	const hemL = asymHem ? Math.max(Y.crotch + 12, hemY - 42) : hemY;
	const R = leg(wyR, hemY);
	const Ld = curve(leg(wyL, hemL).pts.map((q) => ({
		...q,
		x: 100 - q.x
	})));
	const side = (y) => y < crotch ? torsoHalf(b, y) + 1.6 : outerLeg(y, hemY);
	const mask = holes(p, side, hemY, true);
	const hemPts = (s, hy) => [
		pt(100 + s * innerLeg(hy, hy), hy),
		pt(100 + s * mid(hy), hy + 1),
		pt(100 + s * outerLeg(hy, hy), hy)
	];
	const hemAll = [...hemPts(-1, hemL).reverse(), ...hemPts(1, hemY)];
	const jeans = item.type === "Jeans" || attr(spec, "Material") === "Denim";
	return /* @__PURE__ */ jsxs(Art, {
		k: `bottoms.type.${slug(item.type)}`,
		children: [
			/* @__PURE__ */ jsx("defs", { children: mask }),
			/* @__PURE__ */ jsxs("g", {
				mask: mask ? `url(#${p.uid}-cut)` : void 0,
				"data-art": artKey("bottoms", "fit-silhouette", fit),
				children: [/* @__PURE__ */ jsx(Fab, {
					p,
					d: Ld,
					alpha: p.alphaMixed
				}), /* @__PURE__ */ jsx(Fab, {
					p,
					d: R.d,
					alpha: p.alphaMixed
				})]
			}),
			/* @__PURE__ */ jsx(Line, {
				d: [-1, 1].map((s) => `M${100 + s * (mid(Y.knee) - 3)} ${Y.knee - 2}q${s * 3} 2 ${s * 6} 0M${100 + s * (mid(Y.thigh) - 4)} ${Y.crotch + 6}q${s * 2} 6 ${s * 5} 10`).join(""),
				w: .35,
				o: .45
			}),
			!chaps && /* @__PURE__ */ jsx(Line, {
				d: `M100 ${wy + 5}V${crotch - 2}`,
				w: .5,
				o: .65
			}),
			item.type === "Trousers" && /* @__PURE__ */ jsx(Line, {
				d: [-1, 1].map((s) => `M${100 + s * mid(Y.thigh)} ${Y.thigh - 8}L${100 + s * mid(hemY)} ${hemY}`).join(""),
				w: .4,
				o: .45
			}),
			jeans && /* @__PURE__ */ jsxs(Art, {
				k: "bottoms.jeans-topstitch",
				children: [/* @__PURE__ */ jsx(Line, {
					d: [-1, 1].map((s) => `M${100 + s * (torsoHalf(b, wy + 3) - 7)} ${wy + 6}Q${100 + s * (torsoHalf(b, wy + 11) - 2.5)} ${wy + 9} ${100 + s * (torsoHalf(b, wy + 16) + 1)} ${wy + 16}`).join("") + `M103 ${wy + 5}Q104 ${crotch - 8} 100 ${crotch - 3}`,
					c: p.metal,
					w: .45,
					o: .9,
					dash: "1.1 0.8"
				}), /* @__PURE__ */ jsx("circle", {
					cx: 100,
					cy: wy + 2.5,
					r: 1.2,
					fill: p.metal,
					stroke: "#2b1b33",
					strokeWidth: .35
				})]
			}),
			chaps && /* @__PURE__ */ jsx(Fab, {
				p,
				k: "bottoms.chaps-belt",
				fill: p.secondary,
				d: `M${100 - torsoHalf(b, wy) - 2} ${wy - 1}H${100 + torsoHalf(b, wy) + 2}l1 6H${100 - torsoHalf(b, wy) - 3}Z`
			}),
			!chaps && /* @__PURE__ */ jsx(Waistband, {
				p,
				wyL,
				wyR,
				side: (y) => torsoHalf(b, y) + 1.6
			}),
			hemDesign === "Cuffed" && [hemPts(-1, hemL), hemPts(1, hemY)].map((h, i) => /* @__PURE__ */ jsx(Fab, {
				p,
				k: "bottoms.leg-hem-design.cuffed",
				fill: p.fabric2,
				wash: false,
				d: `M${h[0].x} ${h[0].y - 5}L${h[2].x} ${h[2].y - 5}L${h[2].x} ${h[2].y + 1}L${h[0].x} ${h[0].y + 1}Z`
			}, i)),
			hemDesign === "Fringed" && /* @__PURE__ */ jsx(Trim, {
				p,
				kind: "Fringe",
				hem: hemAll
			}),
			hemDesign === "Detachable" && /* @__PURE__ */ jsx(Line, {
				d: [-1, 1].map((s) => `M${100 + s * innerLeg(Y.knee, hemY)} ${Y.knee}L${100 + s * outerLeg(Y.knee, hemY)} ${Y.knee}`).join(""),
				dash: "1.3 1",
				o: .75
			}),
			item.type === "Harem pants" && /* @__PURE__ */ jsx(Line, {
				d: [-1, 1].map((s) => `M${100 + s * innerLeg(hemY - 5, hemY)} ${hemY - 5}L${100 + s * outerLeg(hemY - 5, hemY)} ${hemY - 5}`).join(""),
				w: .7,
				o: .65
			}),
			/* @__PURE__ */ jsx(Details, {
				p,
				side,
				wy,
				hemY,
				legs: true
			}),
			/* @__PURE__ */ jsx(BottomSignature, {
				p,
				side,
				wy,
				hemY,
				hem: hemAll
			})
		]
	});
}
//#endregion
//#region app/components/garments/coats.tsx
/**
* Coats. Labels: coats.type.<x>, coats.silhouette.<x>, coats.collar-neck.<x>, coats.closure.<x>,
* coats.structure.<x>, coats.details.<x>, coats.signature.<x>, coats.lining (back part),
* coats.sleeves.pipa (Ming hanging sleeves), coats.binding (contrast edge piping)
*/
var COAT_HEM = [
	LEN.cropped,
	LEN.waist,
	LEN.hip,
	Y.crotch + 18,
	LEN.knee,
	Y.knee + 26,
	LEN.floor,
	Y.floor + 6
];
var CAPES = ["Cape", "Cloak"];
var SH = Y.shoulder;
var NECK_Y = Y.neck + 7;
onTune(() => {
	COAT_HEM = [
		LEN.cropped,
		LEN.waist,
		LEN.hip,
		Y.crotch + 18,
		LEN.knee,
		Y.knee + 26,
		LEN.floor,
		Y.floor + 6
	];
	SH = Y.shoulder;
	NECK_Y = Y.neck + 7;
});
function coatSide(p, hemY) {
	const { b } = p;
	const sil = attr(p.spec, "Silhouette");
	const body = (y) => torsoHalf(b, y);
	const base = 3.2 + (p.item.type === "Puffer" ? 5 : 0) + (attr(p.spec, "Structure") === "Padded" ? 1.6 : 0);
	const W = Math.max(b.bust, b.hip) + base;
	switch (sil) {
		case "Fitted":
		case "Tailored": return (y) => Math.max(body(y) + base - (sil === "Fitted" ? .8 : 0), y > Y.hip ? b.hip + base + (y - Y.hip) * .12 : 0);
		case "Oversized": return (y) => W + 8 + p.ex * 2.5 + (y - SH) * .03;
		case "Boxy": return () => W + 5;
		case "Cocoon": return (y) => W + (8 + 5 * p.ex) * Math.sin(Math.PI * Math.min(1, (y - SH) / Math.max(36, hemY - SH))) + 1.6;
		case "A-line": return (y) => Math.max(body(y) + base, b.bust + base + Math.max(0, y - Y.bust) * .2 * (1 + p.ex * .3));
		default: return (y) => Math.max(body(y) + base + .8, y > Y.waist ? b.hip + base + .8 : 0);
	}
}
function capeSide(p) {
	const { b } = p;
	const reach = Math.max(b.wrist + 9, b.hip + 13) + p.ex * 5;
	return (y) => {
		const u = Math.min(1, Math.max(0, (y - SH) / 95));
		return b.shoulder + 5 + (reach - b.shoulder - 5) * Math.sin(u * Math.PI / 2) + Math.max(0, y - Y.hip) * .07;
	};
}
function Coat({ p, part }) {
	const { b, spec, item } = p;
	const hemY = COAT_HEM[item.size] ?? Y.crotch + 18;
	const cape = CAPES.includes(item.type) || attr(spec, "Sleeves") === "Cape sleeves";
	const side = cape ? capeSide(p) : coatSide(p, hemY);
	const collar = attr(spec, "Collar / Neck");
	const shoulderPad = attr(spec, "Silhouette") === "Exaggerated shoulders" ? 8 + p.ex * 2.5 : 0;
	const shoulderY = SH - shoulderPad * .3;
	const train = attr(spec, "Details").includes("Detachable trains") || spec.signature === "Sweeping train" || item.size === 7;
	if (part === "back") {
		const ys = [
			Y.bust,
			Y.underbust + 10,
			Y.waist + 10,
			Y.hip,
			Y.thigh,
			Y.knee,
			Y.calf + 20,
			Y.ankle
		].filter((y) => y < hemY);
		const lining = curve([
			pt(100 - b.neck - 3, NECK_Y - 2, true),
			pt(100 + b.neck + 3, NECK_Y - 2, true),
			pt(100 + b.shoulder + shoulderPad, shoulderY, true),
			...ys.map((y) => pt(100 + side(y), y)),
			pt(100 + side(hemY), hemY + (train ? 5 : 0), true),
			pt(100 - side(hemY), hemY + (train ? 5 : 0), true),
			...[...ys].reverse().map((y) => pt(100 - side(y), y)),
			pt(100 - b.shoulder - shoulderPad, shoulderY, true)
		]);
		const liningFill = spec.signature === "Contrast lining" ? p.fabric2 : p.dark;
		return /* @__PURE__ */ jsxs(Art, {
			k: "coats.lining",
			children: [
				train && /* @__PURE__ */ jsx(Fab, {
					p,
					k: "coats.details.detachable-trains",
					fill: liningFill,
					d: curve([
						pt(100 - side(hemY - 26), hemY - 26),
						pt(100 - side(hemY) - 26, Y.floor + 2),
						pt(100 - side(hemY) - 30, Y.floor + 7, true),
						pt(100 + side(hemY) + 30, Y.floor + 7, true),
						pt(100 + side(hemY) + 26, Y.floor + 2),
						pt(100 + side(hemY - 26), hemY - 26)
					])
				}),
				/* @__PURE__ */ jsx(Fab, {
					p,
					d: lining,
					fill: liningFill,
					finish: false
				}),
				collar === "Hood" && /* @__PURE__ */ jsx(Fab, {
					p,
					k: "coats.collar-neck.hood",
					fill: p.fabric,
					d: curve([
						pt(100 - b.shoulder + 3, SH + 2, true),
						pt(100 - HEAD.rx - 7, HEAD.cy + 6),
						pt(100 - HEAD.rx - 3, HEAD.cy - 20),
						pt(100, HEAD.cy - HEAD.ry - 4),
						pt(100 + HEAD.rx + 3, HEAD.cy - 20),
						pt(100 + HEAD.rx + 7, HEAD.cy + 6),
						pt(100 + b.shoulder - 3, SH + 2, true)
					])
				}),
				item.type === "Sculptural coat" && /* @__PURE__ */ jsx(Art, {
					k: "coats.structure.sculptural.panels",
					children: [-1, 1].map((s) => /* @__PURE__ */ jsx(Fab, {
						p,
						fill: p.fabric,
						d: `M${100 + s * (b.shoulder + 1)} ${SH + 2}L${100 + s * (b.shoulder + 12)} ${SH + 6}L${100 + s * (b.wrist + 10)} ${Math.min(hemY + 30, Y.knee)}L${100 + s * (b.wrist + 2)} ${Math.min(hemY + 40, Y.knee + 10)}Z`
					}, s))
				})
			]
		});
	}
	const closure = attr(spec, "Closure");
	const closedTo = (y) => {
		switch (closure) {
			case "Open-front": return b.neck + 3.5 + Math.max(0, y - SH - 10) * .12;
			case "Belt":
			case "Wrap": return y < Y.waist + 4 ? -1.6 : Math.min(side(y) - 5, (y - Y.waist) * .26);
			case "Double-breasted": return -6.5;
			case "Asymmetrical": return -2.5;
			default: return y < SH + 6 ? b.neck + 1.6 : -1.2;
		}
	};
	const panel = (s) => {
		const asym = closure === "Asymmetrical";
		const pts = [pt(100 + s * (b.neck + 2.5), NECK_Y, true), pt(100 + s * (b.shoulder + shoulderPad), shoulderY, true)];
		for (let y = SH + 14; y < hemY; y += 10) pts.push(pt(100 + s * side(y), y));
		pts.push(pt(100 + s * side(hemY), hemY, true));
		const innerHem = asym && s === 1 ? -11 : closedTo(hemY);
		pts.push(pt(100 + s * innerHem, hemY + (closure === "Open-front" ? 0 : 1.6), true));
		for (let y = hemY - 10; y > SH + 6; y -= 12) {
			const x = asym && s === 1 ? -11 + (hemY - y) / (hemY - SH - 6) * 8 : closedTo(y);
			pts.push(pt(100 + s * x, y));
		}
		pts.push(pt(100 + s * Math.min(closedTo(SH + 8), b.neck + 1.6), SH + 2, true));
		return curve(pts);
	};
	const fur = attr(spec, "Material") === "Faux fur" || item.type === "Fur coat";
	const sleeves = cape ? null : attr(spec, "Sleeves");
	const pipa = !cape && sleeves === "Bell" && p.ex >= 2;
	const region = {
		y0: SH + 10,
		y1: hemY - 5,
		w: side
	};
	const details = (spec.attrs.Details ?? "None").split(", ").filter((d) => d !== "None");
	const structure = attr(spec, "Structure");
	const hemLine = curve([
		pt(100 - side(hemY), hemY),
		pt(100, hemY + 2),
		pt(100 + side(hemY), hemY)
	], false);
	const binding = spec.signature === "Contrast binding" || attr(spec, "Color / Pattern") === "Color-blocked";
	return /* @__PURE__ */ jsxs(Art, {
		k: `coats.type.${slug(item.type)}`,
		children: [
			/* @__PURE__ */ jsxs("g", {
				"data-art": artKey("coats", "silhouette", attr(spec, "Silhouette")),
				children: [
					/* @__PURE__ */ jsx(Fab, {
						p,
						d: panel(-1)
					}),
					/* @__PURE__ */ jsx(Fab, {
						p,
						d: panel(1)
					}),
					binding && /* @__PURE__ */ jsxs(Art, {
						k: "coats.binding",
						children: [[panel(-1), panel(1)].map((d, i) => /* @__PURE__ */ jsx("path", {
							d,
							fill: "none",
							stroke: p.secondary,
							strokeWidth: 2.2,
							strokeLinejoin: "round"
						}, i)), [panel(-1), panel(1)].map((d, i) => /* @__PURE__ */ jsx("path", {
							d,
							fill: "none",
							stroke: "#2b1b33",
							strokeWidth: .5
						}, `i${i}`))]
					})
				]
			}),
			hemY - Y.waist > 30 && /* @__PURE__ */ jsx(Line, {
				d: [-1, 1].map((s) => `M${100 + s * side(Y.waist) * .6} ${Y.waist + 6}C${100 + s * side(Y.hip) * .7} ${(Y.waist + hemY) / 2} ${100 + s * side(hemY) * .6} ${hemY - 18} ${100 + s * side(hemY) * .7} ${hemY - 2}`).join(""),
				w: .38,
				o: .4
			}),
			(structure === "Quilted" || item.type === "Puffer") && /* @__PURE__ */ jsx(Art, {
				k: "coats.structure.quilted",
				children: /* @__PURE__ */ jsx(Line, {
					d: Array.from({ length: Math.floor((hemY - SH - 10) / 11) }, (_, i) => {
						const y = SH + 14 + i * 11;
						return `M${100 - side(y)} ${y}Q100 ${y + 2.5} ${100 + side(y)} ${y}`;
					}).join(""),
					w: .45,
					o: .55
				})
			}),
			structure === "Corseted" && /* @__PURE__ */ jsx(Lacing, {
				k: "coats.structure.corseted",
				x: 100,
				y0: Y.waist - 15,
				y1: Y.waist + 13,
				w: 3.2,
				c: p.secondary
			}),
			structure === "Armored" && /* @__PURE__ */ jsx(Art, {
				k: "coats.structure.armored",
				children: [-1, 1].map((s) => [
					0,
					1,
					2
				].map((i) => /* @__PURE__ */ jsx(Fab, {
					p,
					fill: p.metal,
					wash: false,
					d: `M${100 + s * (b.shoulder - 7)} ${SH - 2 + i * 5}Q${100 + s * (b.shoulder + 5 + shoulderPad)} ${SH - 5 + i * 5} ${100 + s * (b.shoulder + 8 + shoulderPad)} ${SH + 7 + i * 5}L${100 + s * (b.shoulder - 5)} ${SH + 5 + i * 5}Z`
				}, `${s}${i}`)))
			}),
			structure === "Sculptural" && /* @__PURE__ */ jsx(Art, {
				k: "coats.structure.sculptural.tucks",
				children: /* @__PURE__ */ jsx(Line, {
					d: [
						0,
						1,
						2,
						3
					].map((i) => `M${100 + b.shoulder - 2} ${SH + 6 + i * 9}Q102 ${SH + 18 + i * 10} ${100 - side(Y.waist) + 4} ${Y.waist - 10 + i * 9}`).join(""),
					w: .6,
					o: .6
				})
			}),
			(structure === "Deconstructed" || structure === "Layered") && /* @__PURE__ */ jsxs(Art, {
				k: artKey("coats", "structure", structure),
				children: [/* @__PURE__ */ jsx(Line, {
					d: hemLine,
					w: .6,
					o: .6,
					dash: structure === "Deconstructed" ? "1.6 1.1" : void 0
				}), structure === "Deconstructed" && /* @__PURE__ */ jsx(Line, {
					d: [-1, 1].map((s) => `M${100 + s * side(SH + 30) * .55} ${SH + 20}L${100 + s * side(hemY) * .55} ${hemY}M${100 + s * side(hemY) * .55} ${hemY}l${-s * 2} -18`).join(""),
					w: .5,
					o: .65,
					dash: "1.4 1"
				})]
			}),
			/* @__PURE__ */ jsxs(Art, {
				k: artKey("coats", "closure", closure),
				children: [
					closure === "Buttons" && Array.from({ length: Math.max(1, Math.floor((Math.min(hemY, Y.thigh) - SH - 10) / 15)) }, (_, i) => /* @__PURE__ */ jsx(Bead, {
						x: 100,
						y: SH + 14 + i * 15,
						r: 1.2,
						c: p.metal
					}, i)),
					closure === "Double-breasted" && Array.from({ length: Math.max(1, Math.floor((Math.min(hemY, Y.hip) - SH - 10) / 15)) }, (_, i) => [-5.5, 5.5].map((dx) => /* @__PURE__ */ jsx(Bead, {
						x: 100 + dx,
						y: SH + 16 + i * 15,
						r: 1.2,
						c: p.metal
					}, `${i}${dx}`))),
					closure === "Zipper" && /* @__PURE__ */ jsx(Line, {
						d: `M100 ${NECK_Y}V${hemY}`,
						w: 1,
						c: p.metal,
						o: 1,
						dash: "0.8 0.6"
					}),
					closure === "Hook-and-eye" && /* @__PURE__ */ jsx(Art, {
						k: "coats.closure.frog",
						children: Array.from({ length: 4 }, (_, i) => {
							const y = SH + 6 + i * 11;
							return /* @__PURE__ */ jsx("path", {
								d: `M96 ${y}q2 -2.5 4 0q2 2.5 4 0M96 ${y}h-1.5M104 ${y}h1.5`,
								stroke: p.metal,
								strokeWidth: .9,
								fill: "none"
							}, i);
						})
					}),
					closure === "Buckle" && [
						SH + 18,
						SH + 32,
						SH + 46,
						SH + 60
					].filter((y) => y < hemY - 6).map((y) => /* @__PURE__ */ jsxs("g", { children: [
						/* @__PURE__ */ jsx("path", {
							d: `M91 ${y}h18`,
							stroke: "#2b1b33",
							strokeWidth: 2.4
						}),
						/* @__PURE__ */ jsx("path", {
							d: `M91 ${y}h18`,
							stroke: p.secondary,
							strokeWidth: 1.5
						}),
						/* @__PURE__ */ jsx("rect", {
							x: 97.8,
							y: y - 2.2,
							width: 4.4,
							height: 4.4,
							rx: .8,
							fill: "none",
							stroke: p.metal,
							strokeWidth: .9
						})
					] }, y)),
					closure === "Asymmetrical" && /* @__PURE__ */ jsx(Line, {
						d: `M105 ${NECK_Y + 2}L89 ${hemY}`,
						w: 1,
						c: p.metal,
						o: 1,
						dash: "0.8 0.6"
					}),
					(closure === "Belt" || closure === "Wrap" || details.includes("Belts")) && /* @__PURE__ */ jsxs("g", { children: [/* @__PURE__ */ jsx(Fab, {
						p,
						fill: p.fabric2,
						wash: false,
						d: `M${100 - side(Y.waist) - 1} ${Y.waist - 3}L${100 + side(Y.waist) + 1} ${Y.waist - 3}L${100 + side(Y.waist + 5) + 1} ${Y.waist + 2.5}L${100 - side(Y.waist + 5) - 1} ${Y.waist + 2.5}Z`
					}), closure === "Wrap" ? /* @__PURE__ */ jsx(MotifArt, {
						kind: "bow",
						x: 108,
						y: Y.waist,
						s: .45,
						fill: p.secondary,
						accent: p.accent
					}) : /* @__PURE__ */ jsx("rect", {
						x: 96.8,
						y: Y.waist - 4,
						width: 6.4,
						height: 7,
						rx: .8,
						fill: "none",
						stroke: p.metal,
						strokeWidth: 1.1
					})] })
				]
			}),
			/* @__PURE__ */ jsx(Collar, {
				p,
				kind: collar,
				shoulderPad,
				binding
			}),
			cape ? /* @__PURE__ */ jsx(CapeDrape, {
				p,
				hemY,
				side
			}) : pipa ? /* @__PURE__ */ jsx(PipaSleeves, { p }) : /* @__PURE__ */ jsx(Sleeves, {
				p,
				kind: sleeves ?? "",
				cat: "coats",
				ease: 1.6 + (item.type === "Puffer" ? 3.5 : 0)
			}),
			item.type === "Bomber" && !cape && /* @__PURE__ */ jsxs(Art, {
				k: "coats.type.bomber.ribbing",
				children: [/* @__PURE__ */ jsx("path", {
					d: hemLine,
					stroke: p.secondary,
					strokeWidth: 4,
					fill: "none"
				}), /* @__PURE__ */ jsx(Line, {
					d: Array.from({ length: 14 }, (_, i) => `M${100 - side(hemY) + i * side(hemY) * 2 / 13} ${hemY - 2}v4`).join(""),
					w: .35,
					o: .7
				})]
			}),
			fur && /* @__PURE__ */ jsx(Art, {
				k: "coats.material.faux-fur",
				children: /* @__PURE__ */ jsx(Fluff, {
					d: panelEdge(side, hemY),
					c: p.light,
					w: 5,
					gap: 3.4
				})
			}),
			item.type === "Puffer" && /* @__PURE__ */ jsx(Fluff, {
				d: hemLine,
				c: p.primary,
				w: 4,
				gap: 5
			}),
			shoulderPad > 0 && /* @__PURE__ */ jsx(Art, {
				k: "coats.silhouette.exaggerated-shoulders",
				children: [-1, 1].map((s) => /* @__PURE__ */ jsx(Fab, {
					p,
					d: `M${100 + s * (b.shoulder - 5)} ${shoulderY + 2}Q${100 + s * (b.shoulder + shoulderPad + 3)} ${shoulderY - 5} ${100 + s * (b.shoulder + shoulderPad + 1.6)} ${shoulderY + 8}Z`
				}, s))
			}),
			details.map((d) => {
				const k = artKey("coats", "details", d);
				switch (d) {
					case "Epaulettes": return /* @__PURE__ */ jsx(Art, {
						k,
						children: [-1, 1].map((s) => /* @__PURE__ */ jsxs("g", { children: [/* @__PURE__ */ jsx(Fab, {
							p,
							fill: p.metal,
							wash: false,
							d: `M${100 + s * (b.neck + 6)} ${SH - 4}L${100 + s * (b.shoulder + shoulderPad + 2)} ${shoulderY - 1}L${100 + s * (b.shoulder + shoulderPad + 2)} ${shoulderY + 4}L${100 + s * (b.neck + 6)} ${SH}Z`
						}), /* @__PURE__ */ jsx(Trim, {
							p,
							kind: "Fringe",
							hem: [pt(100 + s * (b.shoulder + shoulderPad - 3), shoulderY + 4), pt(100 + s * (b.shoulder + shoulderPad + 2.5), shoulderY + 4)]
						})] }, s))
					}, d);
					case "Chains": return /* @__PURE__ */ jsx(Art, {
						k,
						children: /* @__PURE__ */ jsx(Chain, {
							d: `M${100 - side(Y.bust) + 2} ${Y.bust - 6}Q100 ${Y.bust + 14} ${100 + side(Y.bust) - 2} ${Y.bust - 6}`,
							c: p.metal
						})
					}, d);
					case "Oversized pockets": return /* @__PURE__ */ jsx(Art, {
						k,
						children: [-1, 1].filter(() => hemY > Y.waist + 10).map((s) => /* @__PURE__ */ jsxs("g", { children: [/* @__PURE__ */ jsx(Fab, {
							p,
							fill: p.fabric,
							d: `M${100 + s * 8} ${Y.highHip - 10}h${s * 15}v19h${-s * 15}z`
						}), /* @__PURE__ */ jsx(Fab, {
							p,
							fill: binding ? p.secondary : p.fabric2,
							wash: false,
							d: `M${100 + s * 7.5} ${Y.highHip - 11}h${s * 16}v4.5h${-s * 16}z`
						})] }, s))
					}, d);
					case "Fringe":
					case "Feathers":
					case "Crystals":
					case "Embroidery": return /* @__PURE__ */ jsx(Trim, {
						p,
						kind: d,
						region,
						hem: [
							pt(100 - side(hemY), hemY),
							pt(100, hemY + 2),
							pt(100 + side(hemY), hemY)
						]
					}, d);
					default: return null;
				}
			}),
			/* @__PURE__ */ jsx(CoatSignature, {
				p,
				side,
				hemY,
				shoulderPad
			})
		]
	});
}
/** Outer edges of both panels, for fur/feather trim. */
function panelEdge(side, hemY) {
	const pts = [];
	for (let y = SH + 10; y <= hemY; y += 9) pts.push(pt(100 - side(y), y));
	pts.push(pt(100, hemY + 2));
	for (let y = hemY; y >= SH + 10; y -= 9) pts.push(pt(100 + side(y), y));
	return curve(pts, false);
}
/** Huge rounded hanging sleeves (pipa sleeves) — reference: Ming-style jacket. */
function PipaSleeves({ p }) {
	const { b } = p;
	return /* @__PURE__ */ jsx(Art, {
		k: "coats.sleeves.pipa",
		children: [-1, 1].map((s) => {
			const sh = armAt(b, s, 0);
			const w = armAt(b, s, 1);
			const drop = 26 + p.ex * 6;
			const d = curve([
				pt(sh.x, sh.y - 1, true),
				pt(sh.x + s * 10, sh.y + 6),
				pt(w.x + s * 14, w.y - 6),
				pt(w.x + s * 10, w.y + drop * .6),
				pt(w.x - s * 6, w.y + drop),
				pt(w.x - s * 12, w.y + drop * .5),
				pt(w.x - s * 6, w.y + 2, true),
				pt(sh.x - s * 6, sh.y + 22)
			]);
			return /* @__PURE__ */ jsxs("g", { children: [/* @__PURE__ */ jsx(Fab, {
				p,
				d,
				alpha: p.alphaMixed
			}), /* @__PURE__ */ jsx(Line, {
				d: `M${sh.x + s * 4} ${sh.y + 10}Q${w.x + s * 8} ${w.y} ${w.x + s * 2} ${w.y + drop * .8}`,
				w: .4,
				o: .45
			})] }, s);
		})
	});
}
/** A cape/cloak covers the arms: drawn as two big drapes over the shoulders. */
function CapeDrape({ p, hemY, side }) {
	const { b } = p;
	const end = p.item.type !== "Cape" && p.item.type !== "Cloak" ? Math.min(hemY, Y.waist + 4) : hemY;
	return /* @__PURE__ */ jsxs(Art, {
		k: "coats.sleeves.cape-sleeves",
		children: [[-1, 1].map((s) => {
			const pts = [pt(100 + s * (b.neck + 3.5), NECK_Y, true)];
			for (let y = SH + 2; y < end; y += 11) pts.push(pt(100 + s * side(y), y));
			pts.push(pt(100 + s * side(end), end, true));
			pts.push(pt(100 + s * (b.neck + 8 + (end - SH) * .17), end + 3, true));
			return /* @__PURE__ */ jsx(Fab, {
				p,
				d: curve(pts),
				alpha: p.alphaMixed
			}, s);
		}), /* @__PURE__ */ jsx(Line, {
			d: `M${100 - b.neck - 5} ${NECK_Y + 4}Q${100 - b.shoulder - 5} ${SH + 34} ${100 - side(end) + 5} ${end - 5}M${100 + b.neck + 5} ${NECK_Y + 4}Q${100 + b.shoulder + 5} ${SH + 34} ${100 + side(end) - 5} ${end - 5}`,
			w: .4,
			o: .45
		})]
	});
}
function Collar({ p, kind, shoulderPad, binding }) {
	const { b } = p;
	const k = artKey("coats", "collar-neck", kind);
	const nk = b.neck;
	const breakY = attr(p.spec, "Closure") === "Double-breasted" ? Y.bust + 4 : Y.underbust + 4;
	const edge = binding ? p.secondary : INK;
	const sw = binding ? 1.4 : .75;
	switch (kind) {
		case "Notched lapel":
		case "Peak lapel": {
			const peak = kind === "Peak lapel";
			return /* @__PURE__ */ jsx(Art, {
				k,
				children: [-1, 1].map((s) => /* @__PURE__ */ jsx(Fab, {
					p,
					fill: p.fabric2,
					stroke: edge,
					sw,
					d: curve([
						pt(100 + s * (nk + 1.6), NECK_Y - 1, true),
						pt(100 + s * (nk + 7.5), NECK_Y + 5, true),
						pt(100 + s * (nk + (peak ? 17 : 12.5)), peak ? SH + 1 : SH + 5, true),
						pt(100 + s * (nk + 11), SH + 12, true),
						pt(100 + s * 1.6, breakY, true),
						pt(100 + s * (nk + 2.5), SH + 5)
					])
				}, s))
			});
		}
		case "Shawl collar": return /* @__PURE__ */ jsx(Art, {
			k,
			children: [-1, 1].map((s) => /* @__PURE__ */ jsx(Fab, {
				p,
				fill: p.fabric2,
				stroke: edge,
				sw,
				d: curve([
					pt(100 + s * (nk + .8), NECK_Y - 2, true),
					pt(100 + s * (nk + 12.5), SH + 6),
					pt(100 + s * 2.5, breakY, true),
					pt(100 + s * (nk + 2.5), SH + 7)
				])
			}, s))
		});
		case "Stand collar": return /* @__PURE__ */ jsx(Fab, {
			p,
			k,
			fill: p.fabric2,
			stroke: edge,
			sw,
			d: `M${100 - nk - 2.5} ${Y.neck - 2}Q100 ${Y.neck - 5} ${100 + nk + 2.5} ${Y.neck - 2}V${NECK_Y}Q100 ${NECK_Y + 2} ${100 - nk - 2.5} ${NECK_Y}Z`
		});
		case "Funnel neck": return /* @__PURE__ */ jsx(Fab, {
			p,
			k,
			fill: p.fabric,
			stroke: edge,
			sw,
			d: `M${100 - nk - 4} ${Y.chin + 4}Q100 ${Y.chin + 1} ${100 + nk + 4} ${Y.chin + 4}L${100 + nk + 6.5} ${NECK_Y + 2}Q100 ${NECK_Y + 5} ${100 - nk - 6.5} ${NECK_Y + 2}Z`
		});
		case "Hood": return /* @__PURE__ */ jsx(Fab, {
			p,
			k,
			fill: p.fabric,
			d: curve([
				pt(100 - b.shoulder + 5, SH, true),
				pt(100 - nk - 5, NECK_Y - 3),
				pt(100, SH + 4),
				pt(100 + nk + 5, NECK_Y - 3),
				pt(100 + b.shoulder - 5, SH, true),
				pt(100, SH + 12)
			])
		});
		case "Oversized collar": return /* @__PURE__ */ jsx(Art, {
			k,
			children: [-1, 1].map((s) => /* @__PURE__ */ jsx(Fab, {
				p,
				fill: p.fabric2,
				stroke: edge,
				sw,
				d: curve([
					pt(100 + s * (nk - 1), Y.neck + 1, true),
					pt(100 + s * (b.shoulder + shoulderPad + 6 + p.ex * 3), SH - 2),
					pt(100 + s * (b.shoulder + 2), SH + 22 + p.ex * 3, true),
					pt(100 + s * 1.6, SH + 13, true)
				])
			}, s))
		});
		default: return null;
	}
}
function CoatSignature({ p, side, hemY, shoulderPad }) {
	const sig = p.spec.signature;
	const k = `coats.signature.${slug(sig)}`;
	const { b } = p;
	switch (sig) {
		case "Giant collar": return /* @__PURE__ */ jsx(Art, {
			k,
			children: [-1, 1].map((s) => /* @__PURE__ */ jsx(Fab, {
				p,
				fill: p.fabric2,
				d: curve([
					pt(100 + s * (b.neck - 2), Y.chin + 8, true),
					pt(100 + s * (b.shoulder + shoulderPad + 13 + p.ex * 4), Y.neck + 4),
					pt(100 + s * (b.shoulder + 8), Y.bust + 10),
					pt(100 + s * 1.6, SH + 20, true)
				])
			}, s))
		});
		case "Fur trim": return /* @__PURE__ */ jsxs(Art, {
			k,
			children: [/* @__PURE__ */ jsx(Fluff, {
				d: panelEdge(side, hemY),
				c: p.light,
				w: 5.5,
				gap: 3.4
			}), /* @__PURE__ */ jsx(Fluff, {
				d: `M${100 - b.shoulder} ${SH}Q100 ${Y.neck - 2} ${100 + b.shoulder} ${SH}`,
				c: p.light,
				w: 6.5,
				gap: 3.4
			})]
		});
		case "Motif brooch": return /* @__PURE__ */ jsx(Art, {
			k,
			children: /* @__PURE__ */ jsx(MotifArt, {
				kind: p.spec.motif,
				x: 100 - b.bust * .5,
				y: Y.bust - 6,
				s: .7,
				fill: p.metal,
				accent: p.accent,
				filter: `url(#${p.uid}-glow)`
			})
		});
		case "Statement cuffs": return attr(p.spec, "Sleeves") !== "Sleeveless" && !CAPES.includes(p.item.type) ? /* @__PURE__ */ jsx(Cuffs, { p }) : null;
		default: return null;
	}
}
//#endregion
//#region app/components/garments/shoes.tsx
/**
* Shoes. Feet are drawn in a 3/4 paper-doll pose, toes angled outward, small and pointed (CLAMP).
* Labels: shoes.type.<x>, shoes.toe-shape.<x>, shoes.sole-heel-design.<x>, shoes.shaft-height.<x>,
* shoes.fastening.<x>, shoes.embellishment.<x>, shoes.signature.<x>, shoes.cuff.<x>
*/
var A = Y.ankle;
var GROUND = Y.floor + 4;
/** Shaft top per size index: No shaft, Ankle, Mid-calf, Knee, Over-the-knee, Thigh. */
var SHAFT_TOP = [
	null,
	A - 12,
	Y.calf + 6,
	Y.knee - 4,
	Y.knee - 20,
	Y.thigh + 2
];
onTune(() => {
	A = Y.ankle;
	GROUND = Y.floor + 4;
	SHAFT_TOP = [
		null,
		A - 12,
		Y.calf + 6,
		Y.knee - 4,
		Y.knee - 20,
		Y.thigh + 2
	];
});
var HEEL_H = {
	Flat: 0,
	Low: 2,
	Medium: 3.5,
	High: 5,
	Extreme: 6.5,
	Platform: 5
};
/** Ankle center for one foot. */
function ankleX(b, s) {
	return 100 + s * ((b.legOuter.ankle + b.legInner.ankle) / 2);
}
/** Bare-foot outline (also used by the body). Absolute points, ankle → toe → heel; scaled by FOOT. */
function footPts(b, s) {
	const ax = ankleX(b, s);
	const X = (dx) => ax + s * dx * FOOT.sx;
	const Yf = (dy) => A + dy * FOOT.sy;
	return [
		pt(X(3), Yf(-2)),
		pt(X(5.5), Yf(8)),
		pt(X(10.5), Yf(17)),
		pt(X(12.5), Yf(20.5), true),
		pt(X(4.5), Yf(21.5)),
		pt(X(-2.6), Yf(18.5)),
		pt(X(-4), Yf(11)),
		pt(X(-3.2), Yf(-2))
	];
}
/** Scales foot-level shoe art around the ankle so it matches the (bigger) feet. */
var footScale = (ax) => `translate(${ax} ${A}) scale(${FOOT.sx} ${FOOT.sy}) translate(${-ax} ${-A})`;
function Shoes({ p, part }) {
	if (part === "back") return null;
	return /* @__PURE__ */ jsxs(Art, {
		k: `shoes.type.${p.item.type.toLowerCase().replace(/\s+/g, "-")}`,
		children: [/* @__PURE__ */ jsx(Shoe, {
			p,
			s: -1
		}), /* @__PURE__ */ jsx(Shoe, {
			p,
			s: 1
		})]
	});
}
function Shoe({ p, s }) {
	const { b, spec, item } = p;
	const type = item.type;
	const heelWord = attr(spec, "Heel Height");
	const sole = attr(spec, "Sole / Heel Design");
	const toe = attr(spec, "Toe Shape");
	const sil = attr(spec, "Silhouette");
	const fastening = attr(spec, "Fastening");
	const mismatched = spec.universal.Symmetry === "Mismatched" && s === 1;
	const heel = HEEL_H[heelWord] ?? 3;
	const chunkySole = sil === "Chunky" || sil === "Exaggerated" || type === "Sneakers";
	const platform = heelWord === "Platform" || sole === "Platform" || type === "Platform heels" ? 3.5 + p.ex : chunkySole ? 2.2 : 0;
	const ax = ankleX(b, s);
	const X = (dx) => ax + s * dx;
	const bulk = chunkySole ? 1.4 : sil === "Delicate" ? -.5 : 0;
	const fill = mismatched ? p.fabric2 : p.fabric;
	const colorBlock = spec.pattern === "colorblock";
	const toeTip = () => {
		switch (toe) {
			case "Pointed": return [pt(X(16.5 + p.ex), A + 21, true)];
			case "Square": return [pt(X(13.5), A + 16.5, true), pt(X(14), A + 21.5, true)];
			case "Almond": return [pt(X(14.5), A + 20.5)];
			case "Split toe": return [
				pt(X(13), A + 17.5),
				pt(X(11.5), A + 20, true),
				pt(X(14), A + 21.5)
			];
			case "Sculptural": return [
				pt(X(15), A + 16.5),
				pt(X(17), A + 13.5, true),
				pt(X(14.5), A + 21.5)
			];
			default: return [pt(X(13.5), A + 20.5)];
		}
	};
	const groundY = GROUND - platform;
	const heelBackY = groundY - 3 - heel;
	const low = [
		"Stilettos",
		"Pumps",
		"Flats",
		"Ballet flats",
		"Mules",
		"Sculptural heels",
		"Platform heels"
	].includes(type);
	const vampTop = low ? A + 12 : A + 4;
	const upper = [
		pt(X(-4 - bulk), vampTop - (low ? 6 : 0), true),
		pt(X(0), vampTop - 2),
		pt(X(6 + bulk), vampTop + 2),
		pt(X(10.5 + bulk), A + 15),
		...toeTip(),
		pt(X(5.5), groundY + .5, true),
		pt(X(-1), heelBackY + 2),
		pt(X(-5 - bulk), heelBackY, true)
	];
	const sandal = ["Sandals", "Gladiator sandals"].includes(type);
	const mule = type === "Mules";
	const toeEnd = toe === "Pointed" ? 16.5 + p.ex : 14.5;
	const solePath = `M${X(-5.5 - bulk)} ${heelBackY + 1}Q${X(3)} ${groundY - .5} ${X(toeEnd)} ${groundY - .2}`;
	const shaftTop = SHAFT_TOP[item.size] ?? null;
	const boot = shaftTop !== null && !sandal;
	return /* @__PURE__ */ jsxs("g", {
		"data-art": `shoes.foot.${s < 0 ? "left" : "right"}`,
		children: [
			boot && /* @__PURE__ */ jsx(Shaft, {
				p,
				s,
				top: shaftTop,
				fill,
				sil
			}),
			/* @__PURE__ */ jsxs("g", {
				transform: footScale(ax),
				children: [
					platform > 0 && /* @__PURE__ */ jsxs(Art, {
						k: chunkySole ? "shoes.sole-heel-design.lug-platform" : "shoes.sole-heel-design.platform",
						children: [/* @__PURE__ */ jsx(Fab, {
							p,
							fill: sole === "Transparent" ? "#ffffff" : chunkySole ? "#2b1b33" : p.fabric2,
							alpha: sole === "Transparent" ? .45 : 1,
							wash: false,
							d: `M${X(-5.5 - bulk)} ${groundY - 2}L${X(toeEnd - 1)} ${groundY - 1}Q${X(toeEnd + 1.5)} ${GROUND - platform / 2} ${X(toeEnd - 1)} ${GROUND}L${X(-5.5 - bulk)} ${GROUND}Z`
						}), chunkySole && /* @__PURE__ */ jsx("path", {
							d: Array.from({ length: 6 }, (_, i) => `M${X(-4 + i * 3.4)} ${GROUND}v-1.6`).join(""),
							stroke: "#fff",
							strokeWidth: .6,
							opacity: .6
						})]
					}),
					heel > 0 && /* @__PURE__ */ jsx(Heel, {
						p,
						x: X(-3),
						s,
						top: heelBackY + 2,
						bottom: GROUND - platform,
						design: type === "Wedges" ? "Wedge" : sole,
						toeX: X(9.5)
					}),
					sandal ? /* @__PURE__ */ jsxs(Art, {
						k: "shoes.type.sandals.straps",
						children: [
							/* @__PURE__ */ jsx("path", {
								d: solePath,
								stroke: INK,
								strokeWidth: 2.2,
								fill: "none"
							}),
							/* @__PURE__ */ jsx("path", {
								d: solePath,
								stroke: p.secondary,
								strokeWidth: 1.3,
								fill: "none"
							}),
							[A + 9, A + 15].map((y) => /* @__PURE__ */ jsx(Strap, {
								p,
								d: `M${X(-3.5)} ${y - 3}Q${X(3.5)} ${y + 2} ${X(11)} ${y + 2}`
							}, y)),
							/* @__PURE__ */ jsx(Strap, {
								p,
								d: `M${X(-4)} ${A}Q${X(0)} ${A + 3} ${X(4)} ${A}`
							})
						]
					}) : /* @__PURE__ */ jsx(Fab, {
						p,
						k: artKey("shoes", "toe-shape", toe),
						fill,
						d: curve(mule ? upper.slice(1, -1) : upper)
					}),
					colorBlock && !sandal && /* @__PURE__ */ jsxs(Art, {
						k: "shoes.colorblock",
						children: [/* @__PURE__ */ jsx(Fab, {
							p,
							fill: p.fabric2,
							d: curve([
								pt(X(7), A + 13),
								...toeTip(),
								pt(X(7), groundY, true)
							])
						}), /* @__PURE__ */ jsx(Fab, {
							p,
							fill: p.fabric2,
							d: curve([
								pt(X(-4.5 - bulk), heelBackY - 6, true),
								pt(X(-1), heelBackY - 4),
								pt(X(-1), heelBackY + 2),
								pt(X(-5 - bulk), heelBackY, true)
							])
						})]
					}),
					toe === "Open toe" && !sandal && /* @__PURE__ */ jsx("path", {
						d: `M${X(10.5)} ${A + 17}q2.6 -1.6 3.4 2.6`,
						fill: "#fff0e8",
						stroke: "#2b1b33",
						strokeWidth: .5
					}),
					!sandal && /* @__PURE__ */ jsx("path", {
						d: solePath,
						stroke: "#2b1b33",
						strokeWidth: .9,
						fill: "none",
						opacity: .8
					}),
					type === "Sneakers" && /* @__PURE__ */ jsxs(Art, {
						k: "shoes.type.sneakers.detail",
						children: [
							/* @__PURE__ */ jsx("path", {
								d: `M${X(-4.5)} ${groundY - 3}Q${X(5)} ${groundY - 1} ${X(14.5)} ${groundY - 1}`,
								stroke: "#fff",
								strokeWidth: 1.6,
								fill: "none"
							}),
							/* @__PURE__ */ jsx(Line, {
								d: `M${X(1)} ${A + 7}l3.4 1.6M${X(2.3)} ${A + 4.5}l3.4 1.6M${X(3.6)} ${A + 9.8}l3.4 1.6`,
								c: p.secondary,
								w: .7,
								o: 1
							}),
							/* @__PURE__ */ jsx(Line, {
								d: `M${X(-2)} ${A + 13}q5 -3.4 10 1.6`,
								c: p.accent,
								w: 1,
								o: 1
							})
						]
					}),
					type === "Loafers" && /* @__PURE__ */ jsx(Fab, {
						p,
						k: "shoes.type.loafers.strap",
						fill: p.fabric2,
						d: `M${X(2)} ${A + 12}l6 1.6v2.2l-6-1.6z`
					}),
					type === "Ballet flats" && /* @__PURE__ */ jsx(MotifArt, {
						kind: "bow",
						x: X(8.5),
						y: A + 14,
						s: .26,
						fill: p.secondary,
						accent: p.accent
					}),
					(spec.attrs.Embellishment ?? "None").split(", ").filter((e) => e !== "None").map((e) => /* @__PURE__ */ jsx(Embellish, {
						p,
						s,
						kind: e,
						shaftTop: boot ? shaftTop : null,
						toeEnd
					}, e)),
					/* @__PURE__ */ jsx(ShoeSignature, {
						p,
						s
					})
				]
			}),
			/* @__PURE__ */ jsx(Fastening, {
				p,
				s,
				kind: fastening,
				shaftTop: boot ? shaftTop : null
			})
		]
	});
}
function Strap({ p, d }) {
	return /* @__PURE__ */ jsxs("g", { children: [/* @__PURE__ */ jsx("path", {
		d,
		stroke: INK,
		strokeWidth: 2,
		fill: "none",
		strokeLinecap: "round"
	}), /* @__PURE__ */ jsx("path", {
		d,
		stroke: p.primary,
		strokeWidth: 1.1,
		fill: "none",
		strokeLinecap: "round"
	})] });
}
function Heel({ p, x, s, top, bottom, design, toeX }) {
	const k = artKey("shoes", "sole-heel-design", design);
	const fill = design === "Transparent" ? "#ffffff" : p.secondary;
	const alpha = design === "Transparent" ? .45 : 1;
	switch (design) {
		case "Block": return /* @__PURE__ */ jsx(Fab, {
			p,
			k,
			fill,
			wash: false,
			d: `M${x - s * 2.3} ${top}h${s * 4.6}l${-s * .5} ${bottom - top}h${-s * 3.6}z`
		});
		case "Wedge": return /* @__PURE__ */ jsx(Fab, {
			p,
			k,
			fill,
			wash: false,
			d: `M${x - s * 2.3} ${top}L${toeX} ${bottom - 2}L${toeX} ${bottom}L${x - s * 2.3} ${bottom}Z`
		});
		case "Curved": return /* @__PURE__ */ jsx(Fab, {
			p,
			k,
			fill,
			wash: false,
			d: `M${x - s * 1.8} ${top}q${s * 5.5} ${(bottom - top) * .5} ${s * 1.8} ${bottom - top}h${s * 1.2}q${s * 3.6} ${-(bottom - top) * .5} ${-s * 1.2} ${-(bottom - top)}z`
		});
		case "Floating": return /* @__PURE__ */ jsxs(Art, {
			k,
			children: [/* @__PURE__ */ jsx(Fab, {
				p,
				fill,
				wash: false,
				d: `M${x - s * 1.4} ${top + 3}h${s * 2.8}l${-s * .6} ${bottom - top - 3}h${-s * 1.4}z`
			}), /* @__PURE__ */ jsx("circle", {
				cx: x,
				cy: top + 1.5,
				r: .5,
				fill: INK
			})]
		});
		case "Sculptural": return /* @__PURE__ */ jsxs(Art, {
			k,
			children: [/* @__PURE__ */ jsx(Line, {
				d: `M${x} ${top}V${bottom - 4}`,
				w: 1.1,
				c: p.metal,
				o: 1
			}), /* @__PURE__ */ jsx(MotifArt, {
				kind: p.spec.motif,
				x,
				y: bottom - 3,
				s: .24,
				fill: p.metal,
				accent: p.accent
			})]
		});
		default: return /* @__PURE__ */ jsx(Fab, {
			p,
			k,
			fill,
			alpha,
			wash: false,
			d: `M${x - s * 1.8} ${top}h${s * 3}l${-s * 1.1} ${bottom - top}h${-s * .7}z`,
			sw: .6
		});
	}
}
function Shaft({ p, s, top, fill, sil }) {
	const b = p.b;
	const ease = sil === "Chunky" ? 3 : sil === "Exaggerated" ? 4.5 : sil === "Delicate" || sil === "Sleek" ? .8 : 1.6;
	const outer = (y) => 100 + s * (torsoHalf(b, y) + ease);
	const inner = (y) => 100 + s * Math.max(.5, legInnerAt(b, y) - ease * .6);
	const archTop = sil === "Architectural" || sil === "Elongated" ? 5 : 0;
	const pts = [pt(inner(top), top + archTop * .4, true), pt(outer(top) + s * (sil === "Elongated" ? 2.5 : 0), top - archTop, true)];
	for (let y = top + 9; y < A + 6; y += 9) pts.push(pt(outer(y) + (sil === "Exaggerated" ? s * Math.sin(y / 5) * 1.2 : 0), y));
	pts.push(pt(outer(A + 6), A + 6), pt(ankleX(b, s) + s * 8, A + 13), pt(ankleX(b, s) - s * 5, A + 13));
	for (let y = A + 4; y > top; y -= 9) pts.push(pt(inner(y), y));
	const mat = attr(p.spec, "Material");
	const stocking = [
		"Mesh",
		"Lace",
		"Satin",
		"Velvet"
	].includes(mat) && top < Y.knee;
	const organic = p.spec.universal["Shape language"] === "Organic" || p.spec.motif === "leaf";
	const k = artKey("shoes", "shaft-height", SCHEMA.shoes.sizes[p.item.size] ?? "boot");
	return /* @__PURE__ */ jsxs(Art, {
		k,
		children: [
			/* @__PURE__ */ jsx(Fab, {
				p,
				fill,
				alpha: stocking ? .72 : void 0,
				d: curve(pts)
			}),
			stocking && /* @__PURE__ */ jsx(Art, {
				k: "shoes.shaft.stocking",
				children: /* @__PURE__ */ jsx(Line, {
					d: `M${inner(top + 3)} ${top + 3}L${outer(top + 3)} ${top + 3}`,
					w: 1.6,
					c: p.secondary,
					o: .9
				})
			}),
			sil === "Armored" && /* @__PURE__ */ jsx(Line, {
				d: [
					.25,
					.5,
					.75
				].map((u) => {
					const y = top + (A + 6 - top) * u;
					return `M${inner(y)} ${y}Q${(inner(y) + outer(y)) / 2} ${y + 3} ${outer(y)} ${y}`;
				}).join(""),
				w: .7,
				o: .6
			}),
			organic && !stocking && /* @__PURE__ */ jsx(Art, {
				k: "shoes.cuff.leaf",
				children: [
					0,
					1,
					2
				].map((i) => {
					const x = inner(top) + (outer(top) - inner(top)) * (i + .5) / 3;
					return /* @__PURE__ */ jsx(MotifArt, {
						kind: "leaf",
						x,
						y: top - 4,
						s: .42,
						rot: (i - 1) * 28 * s,
						fill: p.secondary
					}, i);
				})
			}),
			/* @__PURE__ */ jsx("path", {
				d: `M${inner(top) + s * 2} ${top}v-4h${s * 3}v4`,
				fill: p.fabric2,
				stroke: INK,
				strokeWidth: .4,
				"data-art": "shoes.pull-tab"
			})
		]
	});
}
function Fastening({ p, s, kind, shaftTop }) {
	const ax = ankleX(p.b, s);
	const k = artKey("shoes", "fastening", kind);
	const top = shaftTop ?? A + 2;
	const gladiator = p.item.type === "Gladiator sandals";
	switch (kind) {
		case "Lace-up": {
			const y0 = gladiator ? SHAFT_TOP[p.item.size] ?? A - 14 : top + 2;
			const n = Math.max(2, Math.round((A + 10 - y0) / 5));
			let d = "";
			for (let i = 0; i < n; i++) {
				const y = y0 + i * ((A + 10 - y0) / n);
				d += `M${ax - 2.4} ${y}L${ax + 2.4} ${y + 3.2}M${ax + 2.4} ${y}L${ax - 2.4} ${y + 3.2}`;
			}
			return /* @__PURE__ */ jsxs(Art, {
				k,
				children: [/* @__PURE__ */ jsx("path", {
					d,
					stroke: INK,
					strokeWidth: 1.1
				}), /* @__PURE__ */ jsx("path", {
					d,
					stroke: p.secondary,
					strokeWidth: .6
				})]
			});
		}
		case "Buckle": {
			const ys = shaftTop ? Array.from({ length: Math.max(1, Math.floor((A + 2 - shaftTop) / 10)) }, (_, i) => A + 2 - i * 10) : [A + 3];
			return /* @__PURE__ */ jsx(Art, {
				k,
				children: ys.map((y) => /* @__PURE__ */ jsxs("g", { children: [/* @__PURE__ */ jsx(Strap, {
					p,
					d: `M${ax - 5} ${y}Q${ax} ${y + 1.6} ${ax + 5} ${y}`
				}), /* @__PURE__ */ jsx("rect", {
					x: ax + s * 3 - 1.3,
					y: y - 1.2,
					width: 2.6,
					height: 2.6,
					fill: "none",
					stroke: p.metal,
					strokeWidth: .6
				})] }, y))
			});
		}
		case "Zipper": return shaftTop ? /* @__PURE__ */ jsx(Art, {
			k,
			children: /* @__PURE__ */ jsx(Line, {
				d: `M${ax - s * 2.6} ${top + 2}V${A + 9}`,
				c: p.metal,
				w: .8,
				o: 1,
				dash: "0.6 0.5"
			})
		}) : null;
		case "Straps": return /* @__PURE__ */ jsx(Art, {
			k,
			children: /* @__PURE__ */ jsx(Strap, {
				p,
				d: `M${ax - 4.5} ${A + 3}Q${ax} ${A + 5.5} ${ax + 4.5} ${A + 3}`
			})
		});
		case "Ribbons":
		case "Ankle ties":
		case "Wraparound": {
			const y0 = kind === "Ankle ties" ? A - 10 : kind === "Ribbons" ? Y.calf + 4 : gladiator ? SHAFT_TOP[p.item.size] ?? A - 24 : A - 24;
			const pts = [];
			for (let y = A + 6, i = 0; y > y0; y -= 6, i++) pts.push(`${i % 2 ? ax - 4.8 : ax + 4.8} ${y}`);
			const d = `M${pts.join(" L")}`;
			return /* @__PURE__ */ jsxs(Art, {
				k,
				children: [
					/* @__PURE__ */ jsx("path", {
						d,
						stroke: INK,
						strokeWidth: 1.7,
						fill: "none",
						strokeLinejoin: "round"
					}),
					/* @__PURE__ */ jsx("path", {
						d,
						stroke: p.secondary,
						strokeWidth: .9,
						fill: "none",
						strokeLinejoin: "round"
					}),
					kind !== "Wraparound" && /* @__PURE__ */ jsx(MotifArt, {
						kind: "bow",
						x: ax,
						y: y0 + 2,
						s: .24,
						fill: p.secondary,
						accent: p.accent
					})
				]
			});
		}
		default:
			if (gladiator) {
				const y0 = SHAFT_TOP[p.item.size] ?? A - 12;
				return /* @__PURE__ */ jsx(Art, {
					k: "shoes.type.gladiator.straps",
					children: Array.from({ length: Math.max(1, Math.floor((A + 6 - y0) / 7)) }, (_, i) => /* @__PURE__ */ jsx(Strap, {
						p,
						d: `M${ax - 5} ${y0 + i * 7}Q${ax} ${y0 + i * 7 + 1.6} ${ax + 5} ${y0 + i * 7}`
					}, i))
				});
			}
			return null;
	}
}
function Embellish({ p, s, kind, shaftTop, toeEnd }) {
	const ax = ankleX(p.b, s);
	const X = (dx) => ax + s * dx;
	const k = artKey("shoes", "embellishment", kind);
	switch (kind) {
		case "Crystals": return /* @__PURE__ */ jsx(Art, {
			k,
			children: [
				[4, A + 12],
				[8, A + 15],
				[1, A + 8]
			].map(([dx, y], i) => /* @__PURE__ */ jsx("circle", {
				cx: X(dx),
				cy: y,
				r: .7,
				fill: "#fff",
				stroke: INK,
				strokeWidth: .25
			}, i))
		});
		case "Chains": return /* @__PURE__ */ jsx(Art, {
			k,
			children: /* @__PURE__ */ jsx(Chain, {
				d: `M${X(-3.5)} ${A + 6}Q${X(4)} ${A + 12} ${X(9.5)} ${A + 14}`,
				c: p.metal,
				w: .8
			})
		});
		case "Bows": return /* @__PURE__ */ jsx(Art, {
			k,
			children: /* @__PURE__ */ jsx(MotifArt, {
				kind: "bow",
				x: X(-4.5),
				y: A + 7,
				s: .3,
				fill: p.secondary,
				accent: p.accent
			})
		});
		case "Pearls": return /* @__PURE__ */ jsx(Art, {
			k,
			children: [
				0,
				1,
				2,
				3
			].map((i) => /* @__PURE__ */ jsx(Bead, {
				x: X(-3 + i * 2.2),
				y: A + 4 + i * .5,
				r: .75,
				c: "#fbf6ee"
			}, i))
		});
		case "Spikes": return /* @__PURE__ */ jsx(Art, {
			k,
			children: [
				0,
				1,
				2
			].map((i) => /* @__PURE__ */ jsx("path", {
				d: `M${X(-5)} ${A + 6 + i * 3.6}l${-s * 2.6} 1.3l${s * 2.6} 1.3z`,
				fill: p.metal,
				stroke: INK,
				strokeWidth: .3
			}, i))
		});
		case "Feathers": return /* @__PURE__ */ jsx(Art, {
			k,
			children: /* @__PURE__ */ jsx(Fluff, {
				d: `M${X(3.5)} ${A + 10}q3.6 -2.6 7 1.6`,
				c: p.light,
				w: 3.4,
				gap: 2.2
			})
		});
		case "Flowers": return /* @__PURE__ */ jsx(Art, {
			k,
			children: /* @__PURE__ */ jsx(MotifArt, {
				kind: "flower",
				x: X(7.5),
				y: A + 13,
				s: .26,
				fill: p.secondary,
				accent: p.accent
			})
		});
		case "Fringe": return shaftTop ? /* @__PURE__ */ jsx(Art, {
			k,
			children: Array.from({ length: 6 }, (_, i) => /* @__PURE__ */ jsx("path", {
				d: `M${ax + (-5.5 + i * 2.2) / FOOT.sx} ${A + (shaftTop + 2 - A) / FOOT.sy}v${7 / FOOT.sy}`,
				stroke: p.secondary,
				strokeWidth: .6
			}, i))
		}) : null;
		case "Hardware": return /* @__PURE__ */ jsx(Art, {
			k: `${k}.toe-cap`,
			children: /* @__PURE__ */ jsx("path", {
				d: `M${X(toeEnd - 4.5)} ${A + 15.5}L${X(toeEnd)} ${GROUND - 1.5}L${X(toeEnd - 5.5)} ${GROUND - 1}Z`,
				fill: p.metal,
				stroke: INK,
				strokeWidth: .5
			})
		});
		default: return null;
	}
}
function ShoeSignature({ p, s }) {
	const sig = p.spec.signature;
	const ax = ankleX(p.b, s);
	const X = (dx) => ax + s * dx;
	const k = `shoes.signature.${sig.toLowerCase().replace(/\s+/g, "-")}`;
	switch (sig) {
		case "Oversized bow": return /* @__PURE__ */ jsx(Art, {
			k,
			children: /* @__PURE__ */ jsx(MotifArt, {
				kind: "bow",
				x: X(-2.5),
				y: A + 3,
				s: .5 + p.ex * .08,
				fill: p.secondary,
				accent: p.accent
			})
		});
		case "Motif heel": return /* @__PURE__ */ jsx(Art, {
			k,
			children: /* @__PURE__ */ jsx(MotifArt, {
				kind: p.spec.motif,
				x: X(-3.5),
				y: A + 18,
				s: .28,
				fill: p.metal,
				accent: p.accent
			})
		});
		case "Crystal toe": return /* @__PURE__ */ jsx(Art, {
			k,
			children: /* @__PURE__ */ jsx(MotifArt, {
				kind: "gem",
				x: X(9.5),
				y: A + 16,
				s: .26,
				fill: p.accent,
				filter: `url(#${p.uid}-glow)`
			})
		});
		case "Ankle wings": return /* @__PURE__ */ jsx(Art, {
			k,
			children: /* @__PURE__ */ jsx("path", {
				d: `M${X(-3.5)} ${A}q${-s * 8} -7 ${-s * 11} -2q${s * 3.6} 1 ${s * 1.8} 3.6q${s * 3.6} 0 ${s * 2.6} 2.6z`,
				fill: p.light,
				stroke: INK,
				strokeWidth: .5
			})
		});
		case "Ribbon ties": return /* @__PURE__ */ jsx(Art, {
			k,
			children: /* @__PURE__ */ jsx(Line, {
				d: `M${ax - 4.5} ${A + 6}L${ax + 4.5} ${A - 1}L${ax - 4.5} ${A - 8}L${ax + 4.5} ${A - 15}`,
				c: p.secondary,
				w: 1,
				o: 1
			})
		});
		case "Pearl strap": return /* @__PURE__ */ jsx(Art, {
			k,
			children: [
				0,
				1,
				2,
				3,
				4
			].map((i) => /* @__PURE__ */ jsx(Bead, {
				x: ax - 3.6 + i * 1.8,
				y: A + 3 + i % 2 * .3,
				r: .75,
				c: "#fbf6ee"
			}, i))
		});
		default: return null;
	}
}
//#endregion
//#region app/components/garments/jewelry.tsx
/**
* Jewelry. Labels: jewelry.placement.<x>, jewelry.silhouette.<x>, jewelry.material.<x>,
* jewelry.embellishment.<x>, jewelry.signature.<x>
*/
/** Necklace depth by size; strands start at the neck base NB. */
var NB = Y.neck + 5;
var DEPTH = [
	Y.neck + 12,
	Y.shoulder + 6,
	Y.shoulder + 16,
	Y.bust + 4,
	Y.underbust + 12,
	Y.waist + 18
];
onTune(() => {
	NB = Y.neck + 5;
	DEPTH = [
		Y.neck + 12,
		Y.shoulder + 6,
		Y.shoulder + 16,
		Y.bust + 4,
		Y.underbust + 12,
		Y.waist + 18
	];
});
function matColor(p, mat) {
	switch (mat) {
		case "Gold": return METALS.gold;
		case "Silver": return METALS.silver;
		case "Chrome": return METALS.chrome;
		case "Pearls": return "#fbf6ee";
		case "Crystals": return "#f4fbff";
		case "Gemstones": return p.metal;
		case "Leather": return p.dark;
		case "Organic materials": return p.secondary;
		default: return p.primary;
	}
}
function quad(a, c, b, n = 16) {
	return Array.from({ length: n + 1 }, (_, i) => {
		const t = i / n;
		const u = 1 - t;
		return {
			x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
			y: u * u * a.y + 2 * u * t * c.y + t * t * b.y
		};
	});
}
var toD = (pts) => `M${pts.map((q) => `${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(" L")}`;
/** One strand, styled by material + silhouette. */
function Strand({ p, pts, mat, sil, w = 1 }) {
	const c = matColor(p, mat);
	const d = toD(pts);
	const chunky = sil === "Chunky" ? 1.8 : sil === "Delicate" ? .6 : 1;
	if (mat === "Pearls" || mat === "Plastic" || mat === "Glass" || mat === "Organic materials" || sil === "Chunky") {
		const r = (mat === "Pearls" ? 1.35 : 1.15) * chunky * w;
		return /* @__PURE__ */ jsx(Fluff, {
			d,
			c,
			w: r * 2,
			gap: r * 2.1,
			o: mat === "Glass" ? .75 : 1
		});
	}
	if (mat === "Leather" || mat === "Fabric") return /* @__PURE__ */ jsxs("g", { children: [/* @__PURE__ */ jsx("path", {
		d,
		stroke: INK,
		strokeWidth: 3.2 * chunky,
		fill: "none",
		strokeLinecap: "round"
	}), /* @__PURE__ */ jsx("path", {
		d,
		stroke: c,
		strokeWidth: 2 * chunky,
		fill: "none",
		strokeLinecap: "round"
	})] });
	if (mat === "Crystals") return /* @__PURE__ */ jsxs("g", { children: [/* @__PURE__ */ jsx("path", {
		d,
		stroke: METALS.silver,
		strokeWidth: .7,
		fill: "none"
	}), pts.filter((_, i) => i % 2 === 0).map((q, i) => /* @__PURE__ */ jsx(Bead, {
		x: q.x,
		y: q.y,
		r: 1.1 * chunky,
		c: "#f4fbff"
	}, i))] });
	return /* @__PURE__ */ jsx(Chain, {
		d,
		c,
		w: 1.1 * chunky * w
	});
}
function Jewelry({ p, part }) {
	if (part === "back") return null;
	const { spec, item } = p;
	const placement = attr(spec, "Placement") || "Neck";
	const mat = attr(spec, "Material");
	const sil = attr(spec, "Silhouette");
	return /* @__PURE__ */ jsx(Art, {
		k: `jewelry.type.${item.type.toLowerCase().replace(/\s+/g, "-")}`,
		children: /* @__PURE__ */ jsx(Art, {
			k: artKey("jewelry", "placement", placement),
			children: /* @__PURE__ */ jsx(Placement, {
				p,
				placement: item.type === "Choker" ? "Choker" : placement,
				mat,
				sil
			})
		})
	});
}
function Placement({ p, placement, mat, sil }) {
	const { b, item, spec } = p;
	const size = item.size;
	const gem = mat === "Gemstones" || mat === "Crystals" ? p.accent : mat === "Glass" ? p.primary : p.accent;
	const glow = `url(#${p.uid}-glow)`;
	const metal = [
		"Gold",
		"Silver",
		"Chrome"
	].includes(mat) ? matColor(p, mat) : p.metal;
	const asym = sil === "Asymmetrical" || spec.universal.Symmetry !== "Symmetrical";
	const pendantS = .36 + size * .1 + (sil === "Sculptural" ? .24 : 0);
	const emb = (spec.attrs.Embellishment ?? "None").split(", ").filter((e) => e !== "None");
	const Pendant = ({ at, s = pendantS, kind = spec.motif }) => /* @__PURE__ */ jsx(MotifArt, {
		kind,
		x: at.x,
		y: at.y + 8 * s,
		s,
		fill: mat === "Pearls" ? "#fbf6ee" : mat === "Gemstones" || mat === "Crystals" ? gem : metal,
		accent: gem,
		filter: mat === "Crystals" || emb.includes("LEDs") ? glow : void 0
	});
	const necklace = (depth, spread = b.neck + 3, centerShift = 0) => {
		return quad({
			x: 100 - spread,
			y: NB
		}, {
			x: 100 + centerShift,
			y: depth * 2 - NB - 2
		}, {
			x: 100 + spread,
			y: NB
		});
	};
	const extras = (pts) => /* @__PURE__ */ jsx(Fragment, { children: emb.map((e) => {
		const k = artKey("jewelry", "embellishment", e);
		const sample = pts.filter((_, i) => i % 3 === 1);
		switch (e) {
			case "Rhinestones": return /* @__PURE__ */ jsx(Art, {
				k,
				children: sample.map((q, i) => /* @__PURE__ */ jsx(Sparkle, {
					x: q.x,
					y: q.y,
					s: 1.6,
					glow
				}, i))
			}, e);
			case "Charms":
			case "Enamel": return /* @__PURE__ */ jsx(Art, {
				k,
				children: sample.slice(1, -1).map((q, i) => /* @__PURE__ */ jsx(MotifArt, {
					kind: i % 2 ? spec.motif : "heart",
					x: q.x,
					y: q.y + 4,
					s: .22,
					fill: e === "Enamel" ? p.secondary : metal,
					accent: gem
				}, i))
			}, e);
			case "Pearls": return /* @__PURE__ */ jsx(Art, {
				k,
				children: sample.map((q, i) => /* @__PURE__ */ jsx(Bead, {
					x: q.x,
					y: q.y + 1,
					r: 1.2,
					c: "#fbf6ee"
				}, i))
			}, e);
			case "Fringe": return /* @__PURE__ */ jsx(Art, {
				k,
				children: pts.filter((_, i) => i % 2 === 0).map((q, i) => /* @__PURE__ */ jsx("path", {
					d: `M${q.x} ${q.y}v${5 + i % 3 * 2}`,
					stroke: metal,
					strokeWidth: .7
				}, i))
			}, e);
			case "Feathers": return /* @__PURE__ */ jsx(Art, {
				k,
				children: /* @__PURE__ */ jsx(Fluff, {
					d: toD(pts.slice(Math.floor(pts.length / 3), Math.ceil(pts.length * 2 / 3))),
					c: p.light,
					w: 4,
					gap: 3
				})
			}, e);
			case "Chains": return /* @__PURE__ */ jsx(Art, {
				k,
				children: /* @__PURE__ */ jsx(Chain, {
					d: toD(pts.map((q) => ({
						x: q.x,
						y: q.y + 6
					}))),
					c: metal,
					w: .8
				})
			}, e);
			case "LEDs": return /* @__PURE__ */ jsx(Art, {
				k,
				className: "art-led",
				children: sample.map((q, i) => /* @__PURE__ */ jsx("circle", {
					cx: q.x,
					cy: q.y,
					r: 1.1,
					fill: `hsl(${(p.item.hue + i * 60) % 360} 100% 75%)`,
					filter: glow
				}, i))
			}, e);
			default: return null;
		}
	}) });
	switch (placement) {
		case "Choker": {
			const pts = quad({
				x: 100 - b.neck - 1.2,
				y: Y.neck - 3
			}, {
				x: 100,
				y: Y.neck + .5
			}, {
				x: 100 + b.neck + 1.2,
				y: Y.neck - 3
			}, 8);
			return /* @__PURE__ */ jsxs(Fragment, { children: [
				/* @__PURE__ */ jsx(Strand, {
					p,
					pts,
					mat: mat === "Gold" || mat === "Silver" ? "Fabric" : mat,
					sil: sil === "Delicate" ? "Delicate" : "Chunky"
				}),
				sil === "Spiked" && pts.filter((_, i) => i % 2).map((q, i) => /* @__PURE__ */ jsx("path", {
					d: `M${q.x - 1.2} ${q.y + 1}l1.2 4 1.2-4z`,
					fill: metal,
					stroke: "#2b1b33",
					strokeWidth: .4
				}, i)),
				/* @__PURE__ */ jsx(Pendant, {
					at: {
						x: 100,
						y: Y.neck - .5
					},
					s: .22 + size * .05
				}),
				extras(pts)
			] });
		}
		case "Neck":
		case "Full body": {
			const depth = DEPTH[size] ?? 134;
			const layers = sil === "Layered" || spec.signature === "Layered strands" ? [
				0,
				12,
				24
			] : [0];
			const shift = asym ? 8 : 0;
			const main = necklace(depth, b.neck + 3, shift);
			return /* @__PURE__ */ jsxs(Fragment, { children: [
				layers.map((dy, i) => /* @__PURE__ */ jsx(Strand, {
					p,
					pts: necklace(depth + dy, b.neck + 3 + i * 2, shift),
					mat,
					sil,
					w: 1 - i * .2
				}, i)),
				sil === "Cascading" && main.filter((_, i) => i % 2 === 0 && i > 2 && i < main.length - 3).map((q, i) => /* @__PURE__ */ jsx(MotifArt, {
					kind: "drop",
					x: q.x,
					y: q.y + 6 + i % 2 * 3,
					s: .25,
					fill: gem
				}, i)),
				sil === "Spiked" && main.filter((_, i) => i % 2).map((q, i) => /* @__PURE__ */ jsx("path", {
					d: `M${q.x - 1.3} ${q.y}l1.3 5 1.3-5z`,
					fill: metal,
					stroke: "#2b1b33",
					strokeWidth: .4
				}, i)),
				/* @__PURE__ */ jsx(Pendant, { at: {
					x: 100 + shift * .5,
					y: depth - 2
				} }),
				placement === "Full body" && /* @__PURE__ */ jsxs(Art, {
					k: "jewelry.placement.full-body.chain",
					children: [
						/* @__PURE__ */ jsx(Chain, {
							d: `M${100 + shift * .5} ${depth + 10}L100 ${Y.waist + 6}`,
							c: metal,
							w: .9
						}),
						/* @__PURE__ */ jsx(Chain, {
							d: `M${100 - torsoHalf(b, Y.waist + 8)} ${Y.waist + 6}Q100 ${Y.waist + 18} ${100 + torsoHalf(b, Y.waist + 8)} ${Y.waist + 6}`,
							c: metal,
							w: .9
						}),
						/* @__PURE__ */ jsx(Chain, {
							d: `M${100 - torsoHalf(b, Y.underbust)} ${Y.bust + 4}Q100 ${depth + 26} ${100 + torsoHalf(b, Y.underbust)} ${Y.bust + 4}`,
							c: metal,
							w: .6
						})
					]
				}),
				extras(main),
				/* @__PURE__ */ jsx(JewelrySignature, {
					p,
					anchor: {
						x: 100 + shift * .5,
						y: depth
					},
					metal,
					gem,
					strand: main
				})
			] });
		}
		case "Ears":
		case "Face": {
			const ear = (s) => ({
				x: 100 + s * (p.mannequin ? 14 : HEAD.rx - .5),
				y: Y.eyes + 6
			});
			const drop = [
				0,
				5,
				8,
				12,
				18,
				30
			][size] ?? 8;
			const one = (s) => {
				const e = ear(s);
				const mism = (asym || spec.signature === "Mismatched pair") && s === 1;
				const kind = mism ? spec.motif === "star" ? "moon" : "star" : spec.motif;
				if (sil === "Chunky" && !mism) {
					const r = 2.4 + size * 1.1;
					return /* @__PURE__ */ jsxs("g", { children: [/* @__PURE__ */ jsx("circle", {
						cx: e.x,
						cy: e.y + r,
						r,
						fill: "none",
						stroke: INK,
						strokeWidth: 2.6
					}), /* @__PURE__ */ jsx("circle", {
						cx: e.x,
						cy: e.y + r,
						r,
						fill: "none",
						stroke: metal,
						strokeWidth: 1.6
					})] }, s);
				}
				if (sil === "Layered") return /* @__PURE__ */ jsxs("g", { children: [[
					0,
					3,
					6
				].map((dy) => /* @__PURE__ */ jsx(Bead, {
					x: e.x + s * .5,
					y: e.y - 6 + dy,
					r: .9,
					c: gem
				}, dy)), /* @__PURE__ */ jsx(Pendant, {
					at: {
						x: e.x,
						y: e.y + drop * .4
					},
					s: .25,
					kind
				})] }, s);
				if (sil === "Spiked") return /* @__PURE__ */ jsx("g", { children: /* @__PURE__ */ jsx("path", {
					d: `M${e.x} ${e.y - 6}l${s * 4} -3-${s * 1} 5 ${s * 4} 0-${s * 4} 4z`,
					fill: metal,
					stroke: INK,
					strokeWidth: .5
				}) }, s);
				return /* @__PURE__ */ jsxs("g", { children: [
					/* @__PURE__ */ jsx(Bead, {
						x: e.x,
						y: e.y,
						r: 1.5,
						c: gem
					}),
					drop > 0 && /* @__PURE__ */ jsx(Strand, {
						p,
						pts: [e, {
							x: e.x,
							y: e.y + drop
						}],
						mat: mat === "Pearls" ? "Pearls" : "Gold",
						sil: "Delicate"
					}),
					sil === "Cascading" && drop > 6 && [.4, .7].map((u) => /* @__PURE__ */ jsx(MotifArt, {
						kind: "drop",
						x: e.x + s * 2,
						y: e.y + drop * u,
						s: .24,
						fill: gem
					}, u)),
					/* @__PURE__ */ jsx(Pendant, {
						at: {
							x: e.x,
							y: e.y + drop
						},
						s: .3 + size * .08,
						kind
					})
				] }, s);
			};
			return /* @__PURE__ */ jsxs(Fragment, { children: [
				!(asym && sil === "Asymmetrical") && one(-1),
				one(1),
				placement === "Face" && /* @__PURE__ */ jsxs(Art, {
					k: "jewelry.placement.face.chains",
					children: [
						/* @__PURE__ */ jsx(Chain, {
							d: `M82 ${Y.eyes + 6}Q88 ${Y.eyes + 15} 96 ${Y.eyes + 11}`,
							c: metal,
							w: .5
						}),
						/* @__PURE__ */ jsx(Chain, {
							d: `M118 ${Y.eyes + 6}Q112 ${Y.eyes + 15} 104 ${Y.eyes + 11}`,
							c: metal,
							w: .5
						}),
						[-1, 1].map((s) => [
							0,
							1,
							2
						].map((i) => /* @__PURE__ */ jsx(Bead, {
							x: 100 + s * (6.5 + i * 2),
							y: Y.eyes + 7.5 + i * .4,
							r: .5,
							c: gem
						}, `${s}${i}`)))
					]
				}),
				spec.signature === "Drop cascade" && [-1, 1].map((s) => /* @__PURE__ */ jsx(MotifArt, {
					kind: "drop",
					x: ear(s).x,
					y: ear(s).y + drop + 14,
					s: .3,
					fill: gem
				}, s)),
				spec.signature === "Crystal cluster" && [-1, 1].map((s) => /* @__PURE__ */ jsx(Sparkle, {
					x: ear(s).x,
					y: ear(s).y - 2,
					s: 3,
					glow
				}, s))
			] });
		}
		case "Shoulders": {
			const strands = [-1, 1].flatMap((s) => [quad({
				x: 100 + s * (b.neck + 3),
				y: Y.neck + 6
			}, {
				x: 100 + s * (b.shoulder * .6),
				y: Y.shoulder + 2
			}, {
				x: 100 + s * (b.shoulder + 3),
				y: Y.shoulder + 4
			}), quad({
				x: 100 + s * (b.neck + 4),
				y: Y.neck + 8
			}, {
				x: 100 + s * (b.shoulder * .7),
				y: Y.shoulder + 18 + size * 3
			}, armAt(b, s, .22))]);
			return /* @__PURE__ */ jsxs(Fragment, { children: [
				strands.map((pts, i) => /* @__PURE__ */ jsx(Strand, {
					p,
					pts,
					mat,
					sil
				}, i)),
				[-1, 1].map((s) => /* @__PURE__ */ jsx(Pendant, {
					at: {
						x: 100 + s * (b.shoulder + 2),
						y: Y.shoulder
					},
					s: .24
				}, s)),
				extras(strands[1])
			] });
		}
		case "Wrists": {
			const sides = asym ? [-1] : [-1, 1];
			const count = sil === "Layered" ? 3 : 1;
			return /* @__PURE__ */ jsx(Fragment, { children: sides.flatMap((s) => Array.from({ length: count }, (_, i) => {
				const t = .93 - i * .05;
				const c = armAt(b, s, t);
				const n = armNormal(b, s, t);
				const w = 3 + (sil === "Chunky" ? 1.2 : 0) + size * .3;
				const pts = [
					{
						x: c.x - n.x * w,
						y: c.y - n.y * w + 1
					},
					{
						x: c.x,
						y: c.y + 2
					},
					{
						x: c.x + n.x * w,
						y: c.y + n.y * w + 1
					}
				];
				return /* @__PURE__ */ jsxs("g", { children: [/* @__PURE__ */ jsx(Strand, {
					p,
					pts,
					mat,
					sil,
					w: sil === "Chunky" ? 1.6 : 1
				}), i === 0 && size >= 2 && /* @__PURE__ */ jsx(Pendant, {
					at: {
						x: c.x,
						y: c.y
					},
					s: .18
				})] }, `${s}${i}`);
			})) });
		}
		case "Fingers": return /* @__PURE__ */ jsx(Fragment, { children: [-1, 1].filter((s) => !asym || s === 1).map((s) => {
			const h = armAt(b, s, 1);
			const x = h.x + s * 1;
			const y = h.y + 8;
			return /* @__PURE__ */ jsxs("g", { children: [/* @__PURE__ */ jsx("circle", {
				cx: x,
				cy: y,
				r: 1.6,
				fill: "none",
				stroke: metal,
				strokeWidth: 1
			}), /* @__PURE__ */ jsx(MotifArt, {
				kind: size >= 3 ? spec.motif : "gem",
				x,
				y: y - 1.5,
				s: .12 + size * .05,
				fill: gem,
				filter: glow
			})] }, s);
		}) });
		case "Waist": {
			const y = Y.waist + 6 + size * 2.5;
			const w = torsoHalf(b, y) + 1.5;
			const pts = quad({
				x: 100 - w,
				y: y - 6
			}, {
				x: 100,
				y: y + 14 + size * 3
			}, {
				x: 100 + w,
				y: y - 6
			});
			return /* @__PURE__ */ jsxs(Fragment, { children: [
				/* @__PURE__ */ jsx(Strand, {
					p,
					pts,
					mat,
					sil
				}),
				sil === "Layered" && /* @__PURE__ */ jsx(Strand, {
					p,
					pts: pts.map((q) => ({
						x: q.x,
						y: q.y + 8
					})),
					mat,
					sil
				}),
				size >= 4 && /* @__PURE__ */ jsx(Chain, {
					d: `M100 ${y + 10}V${y + 30 + size * 4}`,
					c: metal,
					w: .9
				}),
				/* @__PURE__ */ jsx(Pendant, {
					at: {
						x: 100,
						y: y + 7 + size * 1.5
					},
					s: .26
				}),
				extras(pts)
			] });
		}
		case "Ankles": return /* @__PURE__ */ jsx(Fragment, { children: [-1, 1].filter((s) => !asym || s === -1).map((s) => {
			const ax = ankleX(b, s);
			const pts = quad({
				x: ax - 5,
				y: Y.ankle - 6
			}, {
				x: ax,
				y: Y.ankle - 2
			}, {
				x: ax + 5,
				y: Y.ankle - 6
			}, 8);
			return /* @__PURE__ */ jsxs("g", { children: [/* @__PURE__ */ jsx(Strand, {
				p,
				pts,
				mat,
				sil
			}), /* @__PURE__ */ jsx(Pendant, {
				at: {
					x: ax,
					y: Y.ankle - 3
				},
				s: .16
			})] }, s);
		}) });
		default: return null;
	}
}
function JewelrySignature({ p, anchor, metal, gem, strand }) {
	const sig = p.spec.signature;
	const k = `jewelry.signature.${sig.toLowerCase().replace(/\s+/g, "-")}`;
	const glow = `url(#${p.uid}-glow)`;
	switch (sig) {
		case "Giant pendant": return /* @__PURE__ */ jsx(Art, {
			k,
			children: /* @__PURE__ */ jsx(MotifArt, {
				kind: p.spec.motif,
				x: anchor.x,
				y: anchor.y + 12,
				s: 1.1 + p.ex * .2,
				fill: metal,
				accent: gem,
				filter: glow
			})
		});
		case "Drop cascade": return /* @__PURE__ */ jsx(Art, {
			k,
			children: strand.filter((_, i) => i % 2 === 1).map((q, i) => /* @__PURE__ */ jsx(MotifArt, {
				kind: "drop",
				x: q.x,
				y: q.y + 5 + i % 3 * 3,
				s: .24,
				fill: gem
			}, i))
		});
		case "Crystal cluster": return /* @__PURE__ */ jsx(Art, {
			k,
			children: [
				[-4, 4],
				[4, 5],
				[0, 10],
				[-2, 15],
				[3, 13]
			].map(([dx, dy], i) => /* @__PURE__ */ jsx(MotifArt, {
				kind: "gem",
				x: anchor.x + dx,
				y: anchor.y + dy,
				s: .22,
				fill: i % 2 ? gem : "#f4fbff",
				filter: glow
			}, i))
		});
		case "Spikes": return /* @__PURE__ */ jsx(Art, {
			k,
			children: strand.filter((_, i) => i % 2).map((q, i) => /* @__PURE__ */ jsx("path", {
				d: `M${q.x - 1.4} ${q.y}l1.4 6 1.4-6z`,
				fill: metal,
				stroke: INK,
				strokeWidth: .4
			}, i))
		});
		default: return null;
	}
}
//#endregion
//#region app/components/garments/patterns.tsx
/**
* Fabric pattern art. Each returns an SVG paint server (<pattern> or gradient) with the given id.
* Label: pattern.<name>. c1 = ground (primary), c2 = print (secondary), c3 = accent.
* `hue` is the primary hue, used for holographic/iridescent spectra.
*/
function PatternDef({ id, kind, c1, c2, c3, hue, scale = 1 }) {
	const T = 10 * scale;
	const tile = (w, h, children, rotate = 0) => /* @__PURE__ */ jsxs("pattern", {
		id,
		"data-art": `pattern.${kind}`,
		patternUnits: "userSpaceOnUse",
		width: w,
		height: h,
		patternTransform: rotate ? `rotate(${rotate})` : void 0,
		children: [/* @__PURE__ */ jsx("rect", {
			width: w,
			height: h,
			fill: c1
		}), children]
	});
	const spectrum = (sat, light, steps = [
		0,
		50,
		110,
		190,
		260,
		330
	]) => steps.map((d, i) => /* @__PURE__ */ jsx("stop", {
		offset: i / (steps.length - 1),
		stopColor: `hsl(${(hue + d) % 360} ${sat}% ${light}%)`
	}, i));
	switch (kind) {
		case "solid": return tile(T, T, null);
		case "gradient": return /* @__PURE__ */ jsxs("linearGradient", {
			id,
			"data-art": "pattern.gradient",
			x1: "0",
			y1: "0",
			x2: "0",
			y2: "1",
			children: [/* @__PURE__ */ jsx("stop", {
				offset: "0",
				stopColor: c1
			}), /* @__PURE__ */ jsx("stop", {
				offset: "1",
				stopColor: c2
			})]
		});
		case "ombre": return /* @__PURE__ */ jsxs("linearGradient", {
			id,
			"data-art": "pattern.ombre",
			x1: "0",
			y1: "0",
			x2: "0",
			y2: "1",
			children: [
				/* @__PURE__ */ jsx("stop", {
					offset: "0",
					stopColor: "#fff"
				}),
				/* @__PURE__ */ jsx("stop", {
					offset: "0.35",
					stopColor: c1
				}),
				/* @__PURE__ */ jsx("stop", {
					offset: "1",
					stopColor: c2
				})
			]
		});
		case "multicolor": return /* @__PURE__ */ jsxs("linearGradient", {
			id,
			"data-art": "pattern.multicolor",
			x1: "0",
			y1: "0",
			x2: "1",
			y2: "1",
			children: [
				/* @__PURE__ */ jsx("stop", {
					offset: "0",
					stopColor: c1
				}),
				/* @__PURE__ */ jsx("stop", {
					offset: "0.33",
					stopColor: c1
				}),
				/* @__PURE__ */ jsx("stop", {
					offset: "0.34",
					stopColor: c2
				}),
				/* @__PURE__ */ jsx("stop", {
					offset: "0.66",
					stopColor: c2
				}),
				/* @__PURE__ */ jsx("stop", {
					offset: "0.67",
					stopColor: c3
				}),
				/* @__PURE__ */ jsx("stop", {
					offset: "1",
					stopColor: c3
				})
			]
		});
		case "colorblock": return /* @__PURE__ */ jsxs("linearGradient", {
			id,
			"data-art": "pattern.colorblock",
			x1: "0",
			y1: "0",
			x2: "1",
			y2: "0.35",
			children: [/* @__PURE__ */ jsx("stop", {
				offset: "0.5",
				stopColor: c1
			}), /* @__PURE__ */ jsx("stop", {
				offset: "0.5",
				stopColor: c2
			})]
		});
		case "holographic": return /* @__PURE__ */ jsx("linearGradient", {
			id,
			"data-art": "pattern.holographic",
			x1: "0",
			y1: "0",
			x2: "1",
			y2: "1",
			children: spectrum(70, 80)
		});
		case "iridescent": return /* @__PURE__ */ jsxs("linearGradient", {
			id,
			"data-art": "pattern.iridescent",
			x1: "0",
			y1: "0",
			x2: "0.6",
			y2: "1",
			children: [
				/* @__PURE__ */ jsx("stop", {
					offset: "0",
					stopColor: c1
				}),
				/* @__PURE__ */ jsx("stop", {
					offset: "0.4",
					stopColor: `hsl(${(hue + 60) % 360} 70% 85%)`
				}),
				/* @__PURE__ */ jsx("stop", {
					offset: "0.7",
					stopColor: `hsl(${(hue + 160) % 360} 60% 82%)`
				}),
				/* @__PURE__ */ jsx("stop", {
					offset: "1",
					stopColor: c1
				})
			]
		});
		case "floral": return tile(T * 2.4, T * 2.4, /* @__PURE__ */ jsxs(Fragment, { children: [
			/* @__PURE__ */ jsx("g", {
				transform: `translate(${T * .6} ${T * .6}) scale(${T * .045})`,
				children: MOTIF_ART.flower(c2, c3)
			}),
			/* @__PURE__ */ jsx("g", {
				transform: `translate(${T * 1.8} ${T * 1.8}) scale(${T * .035}) rotate(30)`,
				children: MOTIF_ART.flower(c3, c2)
			}),
			/* @__PURE__ */ jsx("g", {
				transform: `translate(${T * 1.8} ${T * .5}) scale(${T * .03}) rotate(60)`,
				children: MOTIF_ART.leaf("#7fae5a", c3)
			})
		] }));
		case "roses": return tile(T * 2.6, T * 2.6, /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("g", {
			transform: `translate(${T * .7} ${T * .7}) scale(${T * .05})`,
			children: MOTIF_ART.rose(c2, "#4a7a3a")
		}), /* @__PURE__ */ jsx("g", {
			transform: `translate(${T * 2} ${T * 1.9}) scale(${T * .04})`,
			children: MOTIF_ART.rose(c3, "#4a7a3a")
		})] }));
		case "tropical": return tile(T * 2.6, T * 2.6, /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("g", {
			transform: `translate(${T * .7} ${T * .8}) scale(${T * .07}) rotate(-30)`,
			children: MOTIF_ART.leaf(c2, c3)
		}), /* @__PURE__ */ jsx("g", {
			transform: `translate(${T * 1.9} ${T * 1.8}) scale(${T * .05})`,
			children: MOTIF_ART.flower(c3, c2)
		})] }));
		case "animal": return tile(T * 2, T * 2, /* @__PURE__ */ jsx("g", {
			fill: c2,
			stroke: "none",
			children: [
				[
					.4,
					.5,
					.3
				],
				[
					1.3,
					.3,
					.25
				],
				[
					1,
					1.3,
					.32
				],
				[
					.2,
					1.6,
					.22
				],
				[
					1.7,
					1.6,
					.2
				]
			].map(([x, y, r], i) => /* @__PURE__ */ jsxs("g", { children: [/* @__PURE__ */ jsx("ellipse", {
				cx: x * T,
				cy: y * T,
				rx: r * T * 1.2,
				ry: r * T,
				fill: "none",
				stroke: c2,
				strokeWidth: T * .12,
				strokeDasharray: `${T * .4} ${T * .15}`
			}), /* @__PURE__ */ jsx("ellipse", {
				cx: x * T,
				cy: y * T,
				rx: r * T * .6,
				ry: r * T * .5,
				fill: c3,
				opacity: .8
			})] }, i))
		}));
		case "zebra": return tile(T * 2, T * 2, /* @__PURE__ */ jsx("path", {
			fill: c2,
			d: `M0 ${T * .2}C${T * .6} ${T * .5} ${T * 1.2} 0 ${T * 2} ${T * .3}V${T * .6}C${T * 1.3} ${T * .4} ${T * .7} ${T * .9} 0 ${T * .6}Z
             M0 ${T * 1.1}C${T * .8} ${T * 1.4} ${T * 1.2} ${T * .9} ${T * 2} ${T * 1.2}V${T * 1.45}C${T * 1.2} ${T * 1.25} ${T * .7} ${T * 1.7} 0 ${T * 1.4}Z`
		}), 25);
		case "snake":
		case "scales": return tile(T, T * .8, /* @__PURE__ */ jsxs("g", {
			fill: kind === "scales" ? c1 : "none",
			stroke: c2,
			strokeWidth: T * .07,
			children: [
				/* @__PURE__ */ jsx("path", { d: `M${-T * .5} ${T * .8}A${T * .5} ${T * .5} 0 0 1 ${T * .5} ${T * .8}A${T * .5} ${T * .5} 0 0 1 ${T * 1.5} ${T * .8}` }),
				/* @__PURE__ */ jsx("path", { d: `M0 ${T * .4}A${T * .5} ${T * .5} 0 0 1 ${T} ${T * .4}` }),
				kind === "scales" && /* @__PURE__ */ jsx("path", {
					d: `M${T * .15} ${T * .3}A${T * .35} ${T * .35} 0 0 1 ${T * .5} ${T * .05}`,
					stroke: "#fff",
					opacity: .6
				})
			]
		}));
		case "stripes": return tile(T, T, /* @__PURE__ */ jsx("rect", {
			width: T * .45,
			height: T,
			fill: c2
		}), 0);
		case "pinstripe": return tile(T * .7, T, /* @__PURE__ */ jsx("rect", {
			width: T * .06,
			height: T,
			fill: c2
		}));
		case "plaid": return tile(T * 2, T * 2, /* @__PURE__ */ jsxs(Fragment, { children: [
			/* @__PURE__ */ jsx("rect", {
				y: T * .6,
				width: T * 2,
				height: T * .7,
				fill: c2,
				opacity: .55
			}),
			/* @__PURE__ */ jsx("rect", {
				x: T * .6,
				width: T * .7,
				height: T * 2,
				fill: c2,
				opacity: .55
			}),
			/* @__PURE__ */ jsx("rect", {
				y: T * 1.6,
				width: T * 2,
				height: T * .08,
				fill: c3
			}),
			/* @__PURE__ */ jsx("rect", {
				x: T * 1.6,
				width: T * .08,
				height: T * 2,
				fill: c3
			})
		] }));
		case "gingham": return /* @__PURE__ */ jsxs("pattern", {
			id,
			"data-art": "pattern.gingham",
			patternUnits: "userSpaceOnUse",
			width: T,
			height: T,
			children: [
				/* @__PURE__ */ jsx("rect", {
					width: T,
					height: T,
					fill: "#fffaf4"
				}),
				/* @__PURE__ */ jsx("rect", {
					width: T * .5,
					height: T,
					fill: c1,
					opacity: .45
				}),
				/* @__PURE__ */ jsx("rect", {
					width: T,
					height: T * .5,
					fill: c1,
					opacity: .45
				})
			]
		});
		case "check": return tile(T, T, /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("rect", {
			width: T * .5,
			height: T * .5,
			fill: c2
		}), /* @__PURE__ */ jsx("rect", {
			x: T * .5,
			y: T * .5,
			width: T * .5,
			height: T * .5,
			fill: c2
		})] }), 45);
		case "geometric": return tile(T * 1.4, T * 1.4, /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("path", {
			d: `M${T * .7} 0L${T * 1.4} ${T * .7} ${T * .7} ${T * 1.4} 0 ${T * .7}Z`,
			fill: "none",
			stroke: c2,
			strokeWidth: T * .1
		}), /* @__PURE__ */ jsx("circle", {
			cx: T * .7,
			cy: T * .7,
			r: T * .14,
			fill: c3
		})] }));
		case "abstract": return tile(T * 3, T * 3, /* @__PURE__ */ jsxs("g", {
			fill: "none",
			strokeLinecap: "round",
			children: [
				/* @__PURE__ */ jsx("path", {
					d: `M${T * .2} ${T * .8}C${T} 0 ${T * 1.4} ${T * 1.6} ${T * 2.6} ${T * .6}`,
					stroke: c2,
					strokeWidth: T * .25
				}),
				/* @__PURE__ */ jsx("circle", {
					cx: T * 2.2,
					cy: T * 2.2,
					r: T * .45,
					fill: c3
				}),
				/* @__PURE__ */ jsx("path", {
					d: `M${T * .4} ${T * 2.4}Q${T} ${T * 1.8} ${T * 1.4} ${T * 2.6}`,
					stroke: c3,
					strokeWidth: T * .12
				})
			]
		}));
		case "baroque": return tile(T * 2.4, T * 2.4, /* @__PURE__ */ jsxs("g", {
			fill: "none",
			stroke: c3,
			strokeWidth: T * .07,
			strokeLinecap: "round",
			children: [
				/* @__PURE__ */ jsx("path", { d: `M${T * 1.2} ${T * .2}C${T * .4} ${T * .4} ${T * .4} ${T * 1.2} ${T * 1.2} ${T * 1.2}C${T * 2} ${T * 1.2} ${T * 2} ${T * .4} ${T * 1.2} ${T * .2}Z` }),
				/* @__PURE__ */ jsx("path", { d: `M${T * 1.2} ${T * 1.2}C${T * .9} ${T * 1.6} ${T * .5} ${T * 1.6} ${T * .3} ${T * 1.3}M${T * 1.2} ${T * 1.2}C${T * 1.5} ${T * 1.6} ${T * 1.9} ${T * 1.6} ${T * 2.1} ${T * 1.3}` }),
				/* @__PURE__ */ jsx("path", { d: `M${T * 1.2} ${T * 1.2}V${T * 2.2}M${T * .9} ${T * 1.9}Q${T * 1.2} ${T * 2.4} ${T * 1.5} ${T * 1.9}` }),
				/* @__PURE__ */ jsx("circle", {
					cx: T * 1.2,
					cy: T * .7,
					r: T * .15,
					fill: c2
				})
			]
		}));
		case "digital": return tile(T * 1.6, T * 1.6, /* @__PURE__ */ jsx("g", { children: [
			[
				0,
				0,
				c2
			],
			[
				2,
				1,
				c3
			],
			[
				5,
				0,
				c2
			],
			[
				1,
				3,
				c2
			],
			[
				4,
				3,
				c3
			],
			[
				6,
				5,
				c2
			],
			[
				3,
				6,
				c3
			],
			[
				0,
				6,
				c2
			],
			[
				6,
				2,
				c3
			],
			[
				2,
				5,
				c2
			]
		].map(([x, y, c], i) => /* @__PURE__ */ jsx("rect", {
			x: +x * T / 5,
			y: +y * T / 5,
			width: T / 5,
			height: T / 5,
			fill: c
		}, i)) }));
		case "polka": return tile(T * 1.2, T * 1.2, /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("circle", {
			cx: T * .3,
			cy: T * .3,
			r: T * .18,
			fill: c2
		}), /* @__PURE__ */ jsx("circle", {
			cx: T * .9,
			cy: T * .9,
			r: T * .18,
			fill: c2
		})] }));
		case "stars": return tile(T * 2, T * 2, /* @__PURE__ */ jsxs(Fragment, { children: [
			/* @__PURE__ */ jsx("g", {
				transform: `translate(${T * .5} ${T * .5}) scale(${T * .03})`,
				children: MOTIF_ART.star(c2, c3)
			}),
			/* @__PURE__ */ jsx("g", {
				transform: `translate(${T * 1.5} ${T * 1.4}) scale(${T * .025})`,
				children: MOTIF_ART.sparkle(c3, c2)
			}),
			/* @__PURE__ */ jsx("circle", {
				cx: T * 1.5,
				cy: T * .4,
				r: T * .06,
				fill: c2
			}),
			/* @__PURE__ */ jsx("circle", {
				cx: T * .4,
				cy: T * 1.6,
				r: T * .05,
				fill: c3
			})
		] }));
		case "hearts": return tile(T * 1.8, T * 1.8, /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("g", {
			transform: `translate(${T * .45} ${T * .45}) scale(${T * .028})`,
			children: MOTIF_ART.heart(c2, c3)
		}), /* @__PURE__ */ jsx("g", {
			transform: `translate(${T * 1.35} ${T * 1.35}) scale(${T * .022})`,
			children: MOTIF_ART.heart(c3, c2)
		})] }));
		case "cherries": return tile(T * 2, T * 2, /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("g", {
			transform: `translate(${T * .5} ${T * .6}) scale(${T * .035})`,
			children: MOTIF_ART.cherry(c2, c3)
		}), /* @__PURE__ */ jsx("g", {
			transform: `translate(${T * 1.5} ${T * 1.5}) scale(${T * .03})`,
			children: MOTIF_ART.cherry(c2, c3)
		})] }));
		case "lace": return tile(T, T, /* @__PURE__ */ jsxs("g", {
			fill: "none",
			stroke: c2,
			strokeWidth: T * .06,
			opacity: .9,
			children: [
				/* @__PURE__ */ jsx("circle", {
					cx: T * .5,
					cy: T * .5,
					r: T * .32
				}),
				/* @__PURE__ */ jsx("circle", {
					cx: T * .5,
					cy: T * .5,
					r: T * .12
				}),
				/* @__PURE__ */ jsx("circle", {
					cx: 0,
					cy: 0,
					r: T * .18
				}),
				/* @__PURE__ */ jsx("circle", {
					cx: T,
					cy: 0,
					r: T * .18
				}),
				/* @__PURE__ */ jsx("circle", {
					cx: 0,
					cy: T,
					r: T * .18
				}),
				/* @__PURE__ */ jsx("circle", {
					cx: T,
					cy: T,
					r: T * .18
				})
			]
		}));
		case "quilted": return tile(T * 1.4, T * 1.4, /* @__PURE__ */ jsx("g", {
			stroke: INK,
			strokeWidth: T * .05,
			opacity: .35,
			fill: "none",
			children: /* @__PURE__ */ jsx("path", { d: `M0 0L${T * 1.4} ${T * 1.4}M${T * 1.4} 0L0 ${T * 1.4}` })
		}));
		case "embroidered": return tile(T * 2.6, T * 2.6, /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("g", {
			transform: `translate(${T * 1.3} ${T * 1.3}) scale(${T * .04})`,
			opacity: .95,
			children: MOTIF_ART.flower(c3, c2)
		}), /* @__PURE__ */ jsx("path", {
			d: `M0 ${T * .2}H${T * 2.6}`,
			stroke: c3,
			strokeWidth: T * .05,
			strokeDasharray: `${T * .15} ${T * .12}`
		})] }));
	}
}
//#endregion
//#region app/components/garments/wings.tsx
/**
* Wings (VS-runway inspired — see references/vs). Drawn as a right wing in local coords
* (root at 0,0; +x outward; up is −y), mirrored for the left.
*
* Constructions (label wings.construction.<x>):
*   feathered   heart-shaped angel/bird wings rising above the head, tips curling up
*   cascade     long coque plumes falling to the floor
*   plume-arcs  curling stems with feather leaves
*   blades      translucent organza petal-blades
*   petals      giant rounded petals with rhinestone dots
*   butterfly   lobes with glitter edges + curled filigree at the root
*   insect / dragon / crystal / metal / sculptural
*   shell-fan   mermaid: ribbed scallop shell with pearl rim and lace net
*   fins        mermaid: translucent ribbed fins
* Other labels: wings.shape.<x>, wings.structure.<x>, wings.feather-style.<x>, wings.outline.<x>,
* wings.surface-details.<x>, wings.secondary-elements.<x>, wings.attachment.<x>, wings.signature.<x>
*/
var SPAN = [
	.5,
	.64,
	.8,
	.95,
	1.12,
	1.28,
	1.48
];
var ROOT_Y = Y.bust - 4;
onTune(() => {
	ROOT_Y = Y.bust - 4;
});
var rad = (deg) => deg * Math.PI / 180;
function featherPath(B, deg, L, w, angular, curl = 0) {
	const d = {
		x: Math.cos(rad(deg)),
		y: Math.sin(rad(deg))
	};
	const n = {
		x: -d.y,
		y: d.x
	};
	const T = {
		x: B.x + d.x * L + n.x * curl,
		y: B.y + d.y * L + n.y * curl
	};
	const m = {
		x: B.x + d.x * L * .55,
		y: B.y + d.y * L * .55
	};
	if (angular) return `M${B.x} ${B.y}L${m.x + n.x * w} ${m.y + n.y * w}L${T.x} ${T.y}L${m.x - n.x * w * .6} ${m.y - n.y * w * .6}Z`;
	return `M${B.x} ${B.y}Q${m.x + n.x * w * 1.3} ${m.y + n.y * w * 1.3} ${T.x} ${T.y}Q${m.x - n.x * w * .9} ${m.y - n.y * w * .9} ${B.x} ${B.y}Z`;
}
/** Heart-shaped angel wing: arm rises up and out above the head; feathers fan from down to up-and-out. */
function Feathered({ c, metal = false, blades = false }) {
	const { p, W, H, shape } = c;
	const style = attr(p.spec, "Feather Style");
	const angular = metal || shape === "Angular";
	const tip = {
		x: W * .92,
		y: -H * 1.02
	};
	const ctl = {
		x: W * .02,
		y: -H * .95
	};
	const arm = (t) => {
		const u = 1 - t;
		return {
			x: 2 * u * t * ctl.x + t * t * tip.x,
			y: 2 * u * t * ctl.y + t * t * tip.y
		};
	};
	const lenFor = (t) => {
		switch (shape) {
			case "Pointed": return .45 + .6 * t;
			case "Tapered": return 1 - .5 * t;
			case "Fan-shaped":
			case "Radial": return .78;
			default: return .62 + .3 * Math.sin(Math.PI * Math.min(1, t * 1.15));
		}
	};
	const spread = shape === "Fan-shaped" || shape === "Radial" ? [120, -55] : [96, -28];
	const rows = blades ? [{
		n: 9 + p.density,
		len: 1.15,
		w: .2,
		fill: c.fill,
		off: 0
	}] : [
		{
			n: 15 + p.density * 2,
			len: 1,
			w: .1,
			fill: c.fill,
			off: 0
		},
		{
			n: 12 + p.density,
			len: .64,
			w: .11,
			fill: shape === "Layered" || style === "Layered feathers" ? p.fabric2 : c.fill,
			off: .03
		},
		{
			n: 11,
			len: .36,
			w: .12,
			fill: p.fabric2,
			off: .06
		}
	];
	const tipColor = style === "Feather tips" || p.spec.signature === "Gradient tips";
	return /* @__PURE__ */ jsxs("g", {
		"data-art": blades ? "wings.construction.blades" : `wings.construction.feathered.${style ? style.toLowerCase().replace(/\s+/g, "-") : "layered"}`,
		children: [
			rows.map((row, ri) => /* @__PURE__ */ jsx("g", { children: Array.from({ length: row.n }, (_, i) => {
				const t = (i + .5) / row.n;
				const B = arm(Math.min(1, t * (1 - row.off) + row.off));
				const deg = spread[0] + (spread[1] - spread[0]) * t + (ri ? 6 : 0);
				const L = H * lenFor(t) * row.len;
				const w = H * row.w * (style === "Soft down" ? 1.35 : 1);
				const d = featherPath(B, deg, L, w, angular, ri === 0 && !blades ? -L * .08 : 0);
				const tipPt = {
					x: B.x + Math.cos(rad(deg)) * L * .86,
					y: B.y + Math.sin(rad(deg)) * L * .86
				};
				return /* @__PURE__ */ jsxs("g", { children: [
					/* @__PURE__ */ jsx(Fab, {
						p,
						d,
						fill: metal ? p.metal : row.fill,
						alpha: blades ? Math.min(c.alpha, .5) : c.alpha,
						sw: style === "Graphic feathers" ? 1 : .5,
						wash: ri === 0 && !blades
					}),
					blades && /* @__PURE__ */ jsx("path", {
						d: `M${B.x} ${B.y}L${tipPt.x} ${tipPt.y}`,
						stroke: "#fff",
						strokeWidth: .5,
						opacity: .85
					}),
					!blades && ri === 0 && /* @__PURE__ */ jsx("path", {
						d: `M${B.x} ${B.y}L${tipPt.x} ${tipPt.y}`,
						stroke: "#2b1b33",
						strokeWidth: .25,
						opacity: .45
					}),
					tipColor && ri === 0 && /* @__PURE__ */ jsx("ellipse", {
						"data-art": "wings.feather-style.feather-tips",
						cx: tipPt.x,
						cy: tipPt.y,
						rx: L * .12,
						ry: w * .32,
						transform: `rotate(${deg} ${tipPt.x} ${tipPt.y})`,
						fill: p.secondary,
						stroke: "#2b1b33",
						strokeWidth: .3
					}),
					(style === "Peacock feathers" || p.spec.signature === "Eyespots") && ri === 0 && i % 2 === 0 && /* @__PURE__ */ jsxs("g", {
						"data-art": "wings.feather-style.peacock-eye",
						children: [
							/* @__PURE__ */ jsx("circle", {
								cx: tipPt.x,
								cy: tipPt.y,
								r: w * 1.2,
								fill: p.accent,
								stroke: "#2b1b33",
								strokeWidth: .35
							}),
							/* @__PURE__ */ jsx("circle", {
								cx: tipPt.x,
								cy: tipPt.y,
								r: w * .65,
								fill: p.secondary
							}),
							/* @__PURE__ */ jsx("circle", {
								cx: tipPt.x,
								cy: tipPt.y,
								r: w * .28,
								fill: "#2b1b33"
							})
						]
					})
				] }, i);
			}) }, ri)),
			blades ? /* @__PURE__ */ jsx(Fluff, {
				d: curve([
					0,
					.2,
					.4
				].map((t) => pt(arm(t).x, arm(t).y + 4)), false),
				c: p.light,
				w: 6,
				gap: 3
			}) : /* @__PURE__ */ jsx(Fab, {
				p,
				fill: metal ? p.metal : c.fill,
				alpha: c.alpha,
				d: curve([
					pt(-2, 4),
					...[
						.15,
						.35,
						.55,
						.75,
						.95
					].map((t) => pt(arm(t).x, arm(t).y - 2.5)),
					pt(arm(1).x + 2, arm(1).y + 4, true),
					...[
						.85,
						.6,
						.35,
						.12
					].map((t) => pt(arm(t).x + 2, arm(t).y + H * .1))
				])
			}),
			blades && along([
				.1,
				.5,
				.9
			].map((t) => arm(t)), 7).map((q, i) => /* @__PURE__ */ jsx("circle", {
				cx: q.x + 4,
				cy: q.y + 8 + i * 3,
				r: .5,
				fill: "#fff"
			}, i)),
			style === "Soft down" && /* @__PURE__ */ jsx(Fluff, {
				d: curve([
					0,
					.25,
					.5,
					.75,
					1
				].map((t) => pt(arm(t).x, arm(t).y)), false),
				c: p.light,
				w: 4,
				gap: 3
			}),
			attr(p.spec, "Structure") === "Articulated" && [
				.2,
				.5,
				.8
			].map((t) => /* @__PURE__ */ jsx(Bead, {
				x: arm(t).x,
				y: arm(t).y,
				r: 1.4,
				c: p.metal
			}, t))
		]
	});
}
/** Long coque plumes cascading to the floor (reference: red feather wings on a dress form). */
function Cascade({ c }) {
	const { p, W, H } = c;
	const n = 16 + p.density * 3;
	return /* @__PURE__ */ jsxs("g", {
		"data-art": "wings.construction.cascade",
		children: [Array.from({ length: n }, (_, i) => {
			const t = i / (n - 1);
			const B = {
				x: W * .55 * Math.sin(t * Math.PI * .9),
				y: -H * .55 + t * H * .35
			};
			const L = H * (1.1 + .9 * Math.sin(t * Math.PI));
			const deg = 82 - t * 22 + i * 13 % 9;
			return /* @__PURE__ */ jsx(Fab, {
				p,
				d: featherPath(B, deg, L, H * .07, false, (i % 2 ? 1 : -1) * L * .08),
				fill: i % 3 === 0 ? p.fabric2 : c.fill,
				alpha: c.alpha,
				sw: .45,
				wash: i % 2 === 0
			}, i);
		}), /* @__PURE__ */ jsx(Fluff, {
			d: curve([
				pt(0, -H * .2),
				pt(W * .35, -H * .7),
				pt(W * .6, -H * .4)
			], false),
			c: p.light,
			w: 5,
			gap: 3
		})]
	});
}
/** Curling plume arcs: stems sweep up and out, feather leaves along them (reference: white plume wings). */
function PlumeArcs({ c }) {
	const { p, W, H } = c;
	return /* @__PURE__ */ jsx("g", {
		"data-art": "wings.construction.plume-arcs",
		children: [
			0,
			1,
			2,
			3
		].map((j) => {
			const k = 1 - j * .16;
			const stem = [
				pt(0, 0),
				pt(W * .35 * k, -H * (.25 + j * .12)),
				pt(W * .85 * k, -H * (.5 + j * .1)),
				pt(W * 1.05 * k, -H * (.85 - j * .12))
			];
			const leaves = along(stem, 7);
			return /* @__PURE__ */ jsxs("g", { children: [
				/* @__PURE__ */ jsx("path", {
					d: curve(stem, false),
					stroke: INK,
					strokeWidth: 1.4,
					fill: "none"
				}),
				/* @__PURE__ */ jsx("path", {
					d: curve(stem, false),
					stroke: p.metal,
					strokeWidth: .8,
					fill: "none"
				}),
				leaves.map((q, i) => /* @__PURE__ */ jsx(Fab, {
					p,
					d: featherPath(q, -40 + i * 18 + j * 8, H * .2 * (.6 + i * .07), H * .05, false),
					fill: i % 2 ? c.fill : p.fabric2,
					alpha: c.alpha,
					sw: .4,
					wash: false
				}, i)),
				/* @__PURE__ */ jsx(Fluff, {
					d: curve(stem.slice(-2), false),
					c: p.light,
					w: 3.4,
					gap: 2.6
				})
			] }, j);
		})
	});
}
/** Giant rounded petals with rhinestone dots (reference: pink petal wings). */
function Petals({ c }) {
	const { p, W, H } = c;
	const petal = (deg, L, w) => {
		const d = {
			x: Math.cos(rad(deg)),
			y: Math.sin(rad(deg))
		};
		const n = {
			x: -d.y,
			y: d.x
		};
		return {
			d: curve([
				pt(0, 0, true),
				pt(d.x * L * .4 + n.x * w, d.y * L * .4 + n.y * w),
				pt(d.x * L * .95 + n.x * w * .7, d.y * L * .95 + n.y * w * .7),
				pt(d.x * L, d.y * L),
				pt(d.x * L * .9 - n.x * w * .8, d.y * L * .9 - n.y * w * .8),
				pt(d.x * L * .4 - n.x * w * .8, d.y * L * .4 - n.y * w * .8)
			]),
			mid: {
				x: d.x * L * .6,
				y: d.y * L * .6
			},
			dir: d,
			L
		};
	};
	const ps = [
		petal(-62, H * 1.05, W * .38),
		petal(-10, W * 1.05, H * .36),
		petal(42, H * .95, W * .36)
	];
	return /* @__PURE__ */ jsx("g", {
		"data-art": "wings.construction.petals",
		children: ps.map((q, i) => /* @__PURE__ */ jsxs("g", { children: [
			/* @__PURE__ */ jsx(Fab, {
				p,
				d: q.d,
				fill: c.fill,
				alpha: c.alpha
			}),
			/* @__PURE__ */ jsx(Line, {
				d: `M0 0Q${q.mid.x * .9} ${q.mid.y * 1.1} ${q.dir.x * q.L * .85} ${q.dir.y * q.L * .85}`,
				w: .4,
				o: .45
			}),
			Array.from({ length: 10 + p.density * 3 }, (_, j) => {
				const u = .3 + j * 37 % 70 / 100;
				const off = (j * 53 % 100 / 100 - .5) * .5;
				return /* @__PURE__ */ jsx("circle", {
					cx: q.dir.x * q.L * u - q.dir.y * q.L * off * .5,
					cy: q.dir.y * q.L * u + q.dir.x * q.L * off * .5,
					r: .55,
					fill: "#fff",
					opacity: .9
				}, j);
			})
		] }, i))
	});
}
/** Mermaid world: scallop shell fan — radial ribs, pearl rim, lace net (reference: "Aquatic Angel"). */
function ShellFan({ c }) {
	const { p, W, H } = c;
	const R = Math.max(W, H) * 1.02;
	const angles = Array.from({ length: 7 }, (_, i) => -100 + i * 125 / 6);
	const rim = [];
	angles.forEach((a, i) => {
		rim.push(pt(Math.cos(rad(a)) * R, Math.sin(rad(a)) * R, true));
		if (i < 6) {
			const m = (a + angles[i + 1]) / 2;
			rim.push(pt(Math.cos(rad(m)) * R * .9, Math.sin(rad(m)) * R * .9));
		}
	});
	const body = curve([pt(0, 6, true), ...rim]);
	const net = Array.from({ length: 4 }, (_, k) => {
		const r = R * (.3 + k * .17);
		return curve(angles.map((a, i) => pt(Math.cos(rad(a)) * r * (i % 2 ? .96 : 1), Math.sin(rad(a)) * r * (i % 2 ? .96 : 1))), false);
	}).join("");
	return /* @__PURE__ */ jsxs("g", {
		"data-art": "wings.construction.shell-fan",
		children: [
			/* @__PURE__ */ jsx(Fab, {
				p,
				d: body,
				fill: c.fill,
				alpha: Math.min(c.alpha, .58)
			}),
			/* @__PURE__ */ jsx(Line, {
				d: net,
				c: "#fff",
				w: .5,
				o: .75
			}),
			/* @__PURE__ */ jsx(Line, {
				d: angles.map((a, i) => `M0 0L${Math.cos(rad(a + 9)) * R * .86} ${Math.sin(rad(a + 9)) * R * .86}`).filter((_, i) => i < 6).join(""),
				c: "#fff",
				w: .35,
				o: .6,
				dash: "1 1.4"
			}),
			angles.map((a, i) => /* @__PURE__ */ jsxs("g", { children: [/* @__PURE__ */ jsx("path", {
				d: `M0 0L${Math.cos(rad(a)) * R} ${Math.sin(rad(a)) * R}`,
				stroke: INK,
				strokeWidth: 2.6,
				strokeLinecap: "round"
			}), /* @__PURE__ */ jsx("path", {
				d: `M0 0L${Math.cos(rad(a)) * R} ${Math.sin(rad(a)) * R}`,
				stroke: p.metal,
				strokeWidth: 1.6,
				strokeLinecap: "round"
			})] }, i)),
			along(rim, 18).map((q, i) => /* @__PURE__ */ jsx(Bead, {
				x: q.x,
				y: q.y,
				r: 1.3,
				c: "#fbf6ee"
			}, i)),
			/* @__PURE__ */ jsx(MotifArt, {
				kind: "shell",
				x: W * .12,
				y: -H * .12,
				s: .6,
				fill: p.light
			})
		]
	});
}
/** Mermaid world: translucent ribbed fins with a soft scalloped edge. */
function Fins({ c }) {
	const { p, W, H } = c;
	const fin = (deg0, deg1, L) => {
		const tips = Array.from({ length: 7 }, (_, i) => {
			const a = deg0 + (deg1 - deg0) * i / 6;
			const l = L * (.75 + .25 * Math.sin(Math.PI * i / 6));
			return {
				a,
				x: Math.cos(rad(a)) * l,
				y: Math.sin(rad(a)) * l
			};
		});
		const edge = [];
		tips.forEach((t, i) => {
			edge.push(pt(t.x, t.y, true));
			if (i < 6) {
				const m = {
					x: (t.x + tips[i + 1].x) / 2,
					y: (t.y + tips[i + 1].y) / 2
				};
				edge.push(pt(m.x * .9, m.y * .9));
			}
		});
		return {
			d: curve([pt(0, 0, true), ...edge]),
			tips
		};
	};
	const fins = [fin(-95, -15, H * 1.05), fin(-5, 60, W * .85)];
	return /* @__PURE__ */ jsx("g", {
		"data-art": "wings.construction.fins",
		children: fins.map((f, i) => /* @__PURE__ */ jsxs("g", { children: [
			/* @__PURE__ */ jsx(Fab, {
				p,
				d: f.d,
				fill: c.fill,
				alpha: Math.min(c.alpha, .55)
			}),
			/* @__PURE__ */ jsx(Line, {
				d: f.tips.map((t) => `M0 0Q${t.x * .5 + 3} ${t.y * .5} ${t.x * .96} ${t.y * .96}`).join(""),
				c: p.secondary,
				w: .6,
				o: .85
			}),
			/* @__PURE__ */ jsx(Fluff, {
				d: curve(f.tips.map((t) => pt(t.x, t.y)), false),
				c: "#ffffff",
				w: 2,
				gap: 3,
				o: .7
			})
		] }, i))
	});
}
function lobePts(kind, W, H, shape) {
	const sharp = shape === "Pointed" || shape === "Angular";
	const k = shape === "Tapered" ? 1.25 : 1;
	if (kind === "upper") return [
		pt(0, -3),
		pt(W * .22, -H * .66),
		pt(W * .88 * k, -H * (sharp ? 1 : .88), sharp),
		pt(W * 1.02 * k, -H * .42),
		pt(W * .45, -H * .02)
	];
	return [
		pt(0, 4),
		pt(W * .6, H * .08),
		pt(W * .72 * k, H * (sharp ? .72 : .6), sharp),
		pt(W * .3, H * .7),
		pt(W * .05, H * .34)
	];
}
function Outline({ c, pts }) {
	const { p } = c;
	const o = attr(p.spec, "Outline");
	const k = artKey("wings", "outline", o);
	const edge = along(pts.slice(1, -1), 9 + p.density * 2);
	switch (o) {
		case "Feathery": return /* @__PURE__ */ jsx(Art, {
			k,
			children: /* @__PURE__ */ jsx(Fluff, {
				d: curve(pts, true),
				c: p.light,
				w: 3.2,
				gap: 3.4
			})
		});
		case "Scalloped": return /* @__PURE__ */ jsx(Art, {
			k,
			children: /* @__PURE__ */ jsx(Fluff, {
				d: curve(pts, true),
				c: p.secondary,
				w: 2.8,
				gap: 3.6
			})
		});
		case "Spiked": return /* @__PURE__ */ jsx(Art, {
			k,
			children: edge.map((q, i) => /* @__PURE__ */ jsx("path", {
				d: `M${q.x - 1.6} ${q.y}L${q.x + (q.x > 0 ? 3.4 : -3.4)} ${q.y + (q.y > 0 ? 4 : -4)}L${q.x + 1.6} ${q.y}Z`,
				fill: p.metal,
				stroke: INK,
				strokeWidth: .35
			}, i))
		});
		case "Floral": return /* @__PURE__ */ jsx(Art, {
			k,
			children: edge.map((q, i) => /* @__PURE__ */ jsx(MotifArt, {
				kind: "flower",
				x: q.x,
				y: q.y,
				s: .24,
				fill: p.secondary,
				accent: p.accent
			}, i))
		});
		case "Flame-shaped": return /* @__PURE__ */ jsx(Art, {
			k,
			children: edge.map((q, i) => /* @__PURE__ */ jsx(MotifArt, {
				kind: "drop",
				x: q.x,
				y: q.y,
				s: .28,
				rot: Math.atan2(q.y, q.x) * 57.3 + 90,
				fill: p.secondary
			}, i))
		});
		case "Geometric": return /* @__PURE__ */ jsx(Art, {
			k,
			children: edge.map((q, i) => /* @__PURE__ */ jsx(MotifArt, {
				kind: "gem",
				x: q.x,
				y: q.y,
				s: .17,
				fill: p.accent
			}, i))
		});
		default: return null;
	}
}
function Butterfly({ c, fantasy }) {
	const { p, W, H, shape } = c;
	const up = lobePts("upper", W, H, shape);
	const lo = lobePts("lower", W, H * .92, shape);
	const veins = (pts) => pts.slice(1, -1).map((q) => `M0 0Q${q.x * .4} ${q.y * .6} ${q.x * .92} ${q.y * .92}`).join("");
	return /* @__PURE__ */ jsxs("g", {
		"data-art": fantasy ? "wings.construction.fantasy" : "wings.construction.butterfly",
		children: [
			[lo, up].map((pts, i) => /* @__PURE__ */ jsxs("g", { children: [
				/* @__PURE__ */ jsx(Fab, {
					p,
					d: curve(pts),
					fill: c.fill,
					alpha: c.alpha
				}),
				/* @__PURE__ */ jsx("clipPath", {
					id: `${p.uid}-lobe${i}`,
					children: /* @__PURE__ */ jsx("path", { d: curve(pts) })
				}),
				/* @__PURE__ */ jsxs("g", {
					clipPath: `url(#${p.uid}-lobe${i})`,
					children: [/* @__PURE__ */ jsx("path", {
						d: curve(pts),
						fill: "none",
						stroke: p.secondary,
						strokeWidth: W * .1,
						opacity: .9
					}), along(pts.slice(1, -1), 26).map((q, j) => /* @__PURE__ */ jsx("circle", {
						cx: q.x * .95,
						cy: q.y * .95,
						r: .5 + j % 3 * .25,
						fill: "#fff",
						opacity: .9
					}, j))]
				}),
				/* @__PURE__ */ jsx(Line, {
					d: veins(pts),
					w: .45,
					o: .6
				}),
				/* @__PURE__ */ jsx(Outline, {
					c,
					pts
				})
			] }, i)),
			/* @__PURE__ */ jsx("path", {
				d: `M2 -4c4 -10 12 -10 12 -4s-7 6 -7 0`,
				fill: "none",
				stroke: INK,
				strokeWidth: 1.6
			}),
			/* @__PURE__ */ jsx("path", {
				d: `M2 -4c4 -10 12 -10 12 -4s-7 6 -7 0`,
				fill: "none",
				stroke: p.metal,
				strokeWidth: .9
			}),
			(p.spec.signature === "Eyespots" || attr(p.spec, "Feather Style") === "Peacock feathers") && /* @__PURE__ */ jsxs("g", {
				"data-art": "wings.signature.eyespots",
				children: [
					/* @__PURE__ */ jsx("circle", {
						cx: W * .62,
						cy: -H * .47,
						r: W * .13,
						fill: p.accent,
						stroke: "#2b1b33",
						strokeWidth: .45
					}),
					/* @__PURE__ */ jsx("circle", {
						cx: W * .62,
						cy: -H * .47,
						r: W * .075,
						fill: p.secondary
					}),
					/* @__PURE__ */ jsx("circle", {
						cx: W * .6,
						cy: -H * .49,
						r: W * .028,
						fill: "#fff"
					})
				]
			}),
			fantasy && /* @__PURE__ */ jsxs("g", {
				"data-art": "wings.construction.fantasy.fringe",
				children: [along(lo.slice(1, -1), 7).map((q, i) => /* @__PURE__ */ jsx("path", {
					d: featherPath(q, 80 - i * 6, H * .22, H * .03, false),
					fill: p.fabric2,
					stroke: "#2b1b33",
					strokeWidth: .4
				}, i)), /* @__PURE__ */ jsx(Line, {
					d: `M${W * .15} ${-H * .2}c${W * .2} ${-H * .3} ${W * .5} ${-H * .1} ${W * .35} ${-H * .35}s${W * .3} ${-H * .2} ${W * .45} 0`,
					c: p.metal,
					w: .8,
					o: .9
				})]
			})
		]
	});
}
function Insect({ c }) {
	const { p, W, H, shape } = c;
	const blade = (deg, L, w) => {
		const d = {
			x: Math.cos(rad(deg)),
			y: Math.sin(rad(deg))
		};
		const n = {
			x: -d.y,
			y: d.x
		};
		return {
			pts: [
				pt(0, 0),
				pt(d.x * L * .3 + n.x * w, d.y * L * .3 + n.y * w),
				pt(d.x * L * .8 + n.x * w * .9, d.y * L * .8 + n.y * w * .9),
				pt(d.x * L, d.y * L, shape === "Pointed"),
				pt(d.x * L * .7 - n.x * w * .6, d.y * L * .7 - n.y * w * .6)
			],
			vein: `M0 0L${d.x * L * .95} ${d.y * L * .95}` + Array.from({ length: 7 }, (_, i) => {
				const u = .18 + i * .11;
				return `M${d.x * L * u + n.x * w * .85} ${d.y * L * u + n.y * w * .85}L${d.x * L * (u + .05) - n.x * w * .5} ${d.y * L * (u + .05) - n.y * w * .5}`;
			}).join("")
		};
	};
	const wings = [blade(-34, W * 1.18, H * .17), blade(10, W * 1, H * .14)];
	return /* @__PURE__ */ jsx("g", {
		"data-art": "wings.construction.insect",
		children: wings.reverse().map((w, i) => /* @__PURE__ */ jsxs("g", { children: [
			/* @__PURE__ */ jsx(Fab, {
				p,
				d: curve(w.pts),
				fill: c.fill,
				alpha: Math.min(c.alpha, .5)
			}),
			/* @__PURE__ */ jsx(Line, {
				d: w.vein,
				w: .35,
				o: .65
			}),
			/* @__PURE__ */ jsx(Outline, {
				c,
				pts: w.pts
			})
		] }, i))
	});
}
function Dragon({ c }) {
	const { p, W, H } = c;
	const wrist = {
		x: W * .42,
		y: -H * .7
	};
	const tips = [
		{
			x: W * 1.02,
			y: -H * .82
		},
		{
			x: W * 1.08,
			y: -H * .25
		},
		{
			x: W * .88,
			y: H * .22
		},
		{
			x: W * .45,
			y: H * .42
		}
	];
	let d = `M0 2L${wrist.x} ${wrist.y}L${tips[0].x} ${tips[0].y}`;
	for (let i = 1; i < tips.length; i++) {
		const a = tips[i - 1];
		const b = tips[i];
		d += `Q${(a.x + b.x) / 2 - (a.x + b.x) * .12} ${(a.y + b.y) / 2 - 2} ${b.x} ${b.y}`;
	}
	d += `Q${W * .15} ${H * .25} 0 ${H * .12}Z`;
	const pts = [
		pt(0, 0),
		pt(wrist.x, wrist.y),
		...tips.map((q) => pt(q.x, q.y)),
		pt(0, H * .12)
	];
	const bones = `M0 0L${wrist.x} ${wrist.y}` + tips.map((q) => `M${wrist.x} ${wrist.y}L${q.x} ${q.y}`).join("");
	return /* @__PURE__ */ jsxs("g", {
		"data-art": "wings.construction.dragon",
		children: [
			/* @__PURE__ */ jsx(Fab, {
				p,
				d,
				fill: c.fill,
				alpha: c.alpha
			}),
			/* @__PURE__ */ jsx("path", {
				d: bones,
				stroke: INK,
				strokeWidth: 2,
				strokeLinecap: "round"
			}),
			/* @__PURE__ */ jsx("path", {
				d: bones,
				stroke: p.dark,
				strokeWidth: 1,
				strokeLinecap: "round"
			}),
			/* @__PURE__ */ jsx("path", {
				d: `M${wrist.x} ${wrist.y}l-2.5-6 4 3.4z`,
				fill: p.metal,
				stroke: INK,
				strokeWidth: .35
			}),
			/* @__PURE__ */ jsx(Outline, {
				c,
				pts
			})
		]
	});
}
function Crystal({ c }) {
	const { p, W, H } = c;
	const shards = [
		-75,
		-58,
		-40,
		-24,
		-8,
		10,
		30
	].map((deg, i) => {
		const L = (i % 2 ? .82 : 1.05) * Math.max(W, H) * (1.05 - Math.abs(deg + 30) / 200);
		const d = {
			x: Math.cos(rad(deg)),
			y: Math.sin(rad(deg))
		};
		const n = {
			x: -d.y,
			y: d.x
		};
		const w = H * .07;
		const B = {
			x: d.x * 5,
			y: d.y * 5
		};
		return {
			path: `M${B.x} ${B.y}L${B.x + d.x * L * .6 + n.x * w} ${B.y + d.y * L * .6 + n.y * w}L${B.x + d.x * L} ${B.y + d.y * L}L${B.x + d.x * L * .6 - n.x * w} ${B.y + d.y * L * .6 - n.y * w}Z`,
			facet: `M${B.x} ${B.y}L${B.x + d.x * L} ${B.y + d.y * L}`,
			tip: {
				x: B.x + d.x * L,
				y: B.y + d.y * L
			}
		};
	});
	return /* @__PURE__ */ jsxs("g", {
		"data-art": "wings.construction.crystal",
		children: [shards.map((s, i) => /* @__PURE__ */ jsxs("g", { children: [/* @__PURE__ */ jsx(Fab, {
			p,
			d: s.path,
			fill: i % 2 ? p.fabric2 : c.fill,
			alpha: Math.min(c.alpha, .6),
			wash: false
		}), /* @__PURE__ */ jsx("path", {
			d: s.facet,
			stroke: "#fff",
			strokeWidth: .5,
			opacity: .85
		})] }, i)), shards.filter((_, i) => i % 2 === 0).map((s, i) => /* @__PURE__ */ jsx(Sparkle, {
			x: s.tip.x,
			y: s.tip.y,
			s: 2.4,
			glow: `url(#${p.uid}-glow)`
		}, i))]
	});
}
function Sculptural({ c }) {
	const { p, W, H, shape } = c;
	if (shape === "Radial") return /* @__PURE__ */ jsxs("g", {
		"data-art": "wings.shape.radial",
		children: [Array.from({ length: 9 }, (_, i) => /* @__PURE__ */ jsx(Fab, {
			p,
			fill: i % 2 ? p.fabric2 : c.fill,
			alpha: c.alpha,
			wash: false,
			d: featherPath({
				x: 0,
				y: 0
			}, -100 + i * 19, W * 1.05, H * .035, true)
		}, i)), /* @__PURE__ */ jsx("path", {
			d: `M0 ${-W * 1.05}A${W * 1.05} ${W * 1.05} 0 0 1 0 ${W * 1.05}`,
			fill: "none",
			stroke: p.metal,
			strokeWidth: 1
		})]
	});
	return /* @__PURE__ */ jsx("g", {
		"data-art": "wings.construction.sculptural",
		children: [
			1,
			.75,
			.5
		].map((k, i) => {
			const d = `M0 ${H * .3 * k}C${W * .9 * k} ${H * .2 * k} ${W * 1.1 * k} ${-H * .9 * k} ${W * .1 * k} ${-H * .95 * k}`;
			return /* @__PURE__ */ jsxs("g", { children: [/* @__PURE__ */ jsx("path", {
				d,
				fill: "none",
				stroke: INK,
				strokeWidth: 4.6 - i,
				strokeLinecap: "round"
			}), /* @__PURE__ */ jsx("path", {
				d,
				fill: "none",
				stroke: i % 2 ? p.secondary : p.primary,
				strokeWidth: 3.2 - i * .8,
				strokeLinecap: "round"
			})] }, i);
		})
	});
}
/** Picks the construction from the PRD type + params + the item's world (mermaid → shells & fins). */
function WingShape({ c, type }) {
	const { p, shape } = c;
	const style = attr(p.spec, "Feather Style");
	const mat = attr(p.spec, "Material");
	const sheer = [
		"Organza",
		"Tulle",
		"Chiffon",
		"Iridescent film"
	].includes(mat);
	if (p.item.world === "mermaid") {
		if ([
			"Fantasy wings",
			"Abstract sculptural wings",
			"Crystal wings"
		].includes(type) || [
			"Fan-shaped",
			"Radial",
			"Rounded"
		].includes(shape)) return /* @__PURE__ */ jsx(ShellFan, { c });
		if ([
			"Dragon wings",
			"Insect wings",
			"Butterfly wings"
		].includes(type)) return /* @__PURE__ */ jsx(Fins, { c });
	}
	switch (type) {
		case "Butterfly wings": return /* @__PURE__ */ jsx(Butterfly, { c });
		case "Fantasy wings": return attr(p.spec, "Outline") === "Floral" || shape === "Rounded" ? /* @__PURE__ */ jsx(Petals, { c }) : /* @__PURE__ */ jsx(Butterfly, {
			c,
			fantasy: true
		});
		case "Insect wings": return /* @__PURE__ */ jsx(Insect, { c });
		case "Dragon wings": return /* @__PURE__ */ jsx(Dragon, { c });
		case "Crystal wings": return /* @__PURE__ */ jsx(Crystal, { c });
		case "Metallic wings": return /* @__PURE__ */ jsx(Feathered, {
			c,
			metal: true
		});
		case "Abstract sculptural wings": return /* @__PURE__ */ jsx(Sculptural, { c });
		default:
			if (style === "Long plumes" || style === "Ostrich feathers") return /* @__PURE__ */ jsx(Cascade, { c });
			if (shape === "Curved") return /* @__PURE__ */ jsx(PlumeArcs, { c });
			if (sheer) return /* @__PURE__ */ jsx(Feathered, {
				c,
				blades: true
			});
			return /* @__PURE__ */ jsx(Feathered, { c });
	}
}
function Secondary({ c, kind }) {
	const { p, W, H } = c;
	const k = artKey("wings", "secondary-elements", kind);
	switch (kind) {
		case "Hanging chains": return /* @__PURE__ */ jsxs(Art, {
			k,
			children: [/* @__PURE__ */ jsx(Chain, {
				d: `M${W * .3} ${H * .1}Q${W * .6} ${H * .45} ${W * .9} ${H * .05}`,
				c: p.metal
			}), /* @__PURE__ */ jsx(Chain, {
				d: `M${W * .2} ${H * .25}Q${W * .5} ${H * .7} ${W * .75} ${H * .3}`,
				c: p.metal
			})]
		});
		case "Ribbons":
		case "Streamers": {
			const w = kind === "Ribbons" ? 2.6 : .9;
			return /* @__PURE__ */ jsx(Art, {
				k,
				className: "art-sway",
				children: [0, 7].map((o) => {
					const d = `M${o + 3} ${H * .1}c${W * .2} ${H * .4} ${-W * .15} ${H * .6} ${W * .1} ${H * 1.2}`;
					return /* @__PURE__ */ jsxs("g", { children: [/* @__PURE__ */ jsx("path", {
						d,
						stroke: INK,
						strokeWidth: w + .8,
						fill: "none",
						strokeLinecap: "round"
					}), /* @__PURE__ */ jsx("path", {
						d,
						stroke: o ? p.accent : p.secondary,
						strokeWidth: w,
						fill: "none",
						strokeLinecap: "round"
					})] }, o);
				})
			});
		}
		case "Fabric drapes": return /* @__PURE__ */ jsx(Fab, {
			p,
			k,
			fill: p.fabric2,
			alpha: .45,
			d: `M${W * .8} ${-H * .5}Q${W * 1.1} ${H * .3} ${W * .4} ${H * .95}Q${W * .3} ${H * .4} ${W * .15} ${H * .2}Z`
		});
		case "Trailing feathers": return /* @__PURE__ */ jsx(Art, {
			k,
			className: "art-sway",
			children: [
				0,
				1,
				2
			].map((i) => /* @__PURE__ */ jsx(Fab, {
				p,
				fill: i === 1 ? p.fabric2 : c.fill,
				alpha: c.alpha,
				d: featherPath({
					x: 5 + i * 5,
					y: H * .15
				}, 82 - i * 6, H * (1 + i * .12), H * .05, false)
			}, i))
		});
		case "Detachable ornaments": return /* @__PURE__ */ jsxs(Art, {
			k,
			className: "art-sway",
			children: [/* @__PURE__ */ jsx(Line, {
				d: `M${W * .8} ${-H * .7}v12`,
				c: p.metal,
				o: 1,
				w: .6
			}), /* @__PURE__ */ jsx(MotifArt, {
				kind: p.spec.motif,
				x: W * .8,
				y: -H * .7 + 17,
				s: .42,
				fill: p.metal,
				accent: p.accent
			})]
		});
		default: return null;
	}
}
function Surface({ c, kind }) {
	const { p, W, H } = c;
	const k = artKey("wings", "surface-details", kind);
	const pts = Array.from({ length: 8 + p.density * 4 }, () => {
		const a = p.r.next() * Math.PI * 2;
		const r = Math.sqrt(p.r.next());
		return {
			x: W * .5 + Math.cos(a) * W * .35 * r,
			y: -H * .3 + Math.sin(a) * H * .35 * r
		};
	});
	const glow = `url(#${p.uid}-glow)`;
	switch (kind) {
		case "Crystals": return /* @__PURE__ */ jsx(Art, {
			k,
			children: pts.slice(0, 7).map((q, i) => /* @__PURE__ */ jsx(Sparkle, {
				x: q.x,
				y: q.y,
				s: 2 + i % 3,
				glow
			}, i))
		});
		case "Rhinestones":
		case "Glitter": return /* @__PURE__ */ jsx(Art, {
			k,
			children: pts.map((q, i) => /* @__PURE__ */ jsx("circle", {
				cx: q.x,
				cy: q.y,
				r: kind === "Glitter" ? .5 : .9,
				fill: "#fff",
				stroke: kind === "Glitter" ? "none" : INK,
				strokeWidth: .25
			}, i))
		});
		case "Pearls": return /* @__PURE__ */ jsx(Art, {
			k,
			children: pts.slice(0, 9).map((q, i) => /* @__PURE__ */ jsx(Bead, {
				x: q.x,
				y: q.y,
				r: 1.3,
				c: "#fbf6ee"
			}, i))
		});
		case "Sequins": return /* @__PURE__ */ jsx(Art, {
			k,
			children: pts.map((q, i) => /* @__PURE__ */ jsx("circle", {
				cx: q.x,
				cy: q.y,
				r: 1.1,
				fill: p.metal,
				stroke: INK,
				strokeWidth: .25
			}, i))
		});
		case "Embroidery": return /* @__PURE__ */ jsx(Art, {
			k,
			children: pts.slice(0, 4).map((q, i) => /* @__PURE__ */ jsx(MotifArt, {
				kind: p.spec.motif,
				x: q.x,
				y: q.y,
				s: .3,
				fill: p.metal,
				accent: p.accent
			}, i))
		});
		case "Metallic filigree": return /* @__PURE__ */ jsx(Art, {
			k,
			children: /* @__PURE__ */ jsx(Line, {
				d: pts.slice(0, 4).map((q) => `M${q.x - 7} ${q.y}c2.5-5 7-5 7 0s4 5 7 0`).join(""),
				c: p.metal,
				w: .7,
				o: 1
			})
		});
		case "LED lights": return /* @__PURE__ */ jsx(Art, {
			k,
			className: "art-led",
			children: pts.map((q, i) => /* @__PURE__ */ jsx("circle", {
				cx: q.x,
				cy: q.y,
				r: 1.1,
				fill: `hsl(${(p.item.hue + i * 40) % 360} 100% 75%)`,
				filter: glow
			}, i))
		});
		default: return null;
	}
}
var MOTION = {
	Fluttering: "art-flutter",
	Flexible: "art-flex",
	Articulated: "art-articulate",
	Cascading: "art-flex",
	Rotating: "art-rotate",
	"Light-reactive": "art-light"
};
function Wings({ p, part }) {
	const { b, spec, item } = p;
	const attachment = attr(spec, "Attachment");
	if (part === "front") {
		if (attachment === "Harness") return /* @__PURE__ */ jsxs(Art, {
			k: "wings.attachment.harness",
			children: [[-1, 1].map((s) => {
				const d = `M${100 + s * (b.shoulder - 7)} ${Y.shoulder - 1}Q${100 + s * 5} ${Y.bust - 4} ${100 + s * (b.bust - 2)} ${Y.underbust}`;
				return /* @__PURE__ */ jsxs("g", { children: [/* @__PURE__ */ jsx("path", {
					d,
					stroke: INK,
					strokeWidth: 2.4,
					fill: "none"
				}), /* @__PURE__ */ jsx("path", {
					d,
					stroke: p.metal,
					strokeWidth: 1.4,
					fill: "none"
				})] }, s);
			}), /* @__PURE__ */ jsx("circle", {
				cx: 100,
				cy: Y.bust - 6,
				r: 2,
				fill: p.metal,
				stroke: INK,
				strokeWidth: .45
			})]
		});
		if (attachment === "Corset-integrated") return /* @__PURE__ */ jsx(Fab, {
			p,
			k: "wings.attachment.corset-integrated",
			fill: p.fabric2,
			d: `M${100 - b.waist - 2.5} ${Y.waist - 14}Q100 ${Y.waist - 17} ${100 + b.waist + 2.5} ${Y.waist - 14}L${100 + b.waist + 2.5} ${Y.waist + 1}Q100 ${Y.waist + 4} ${100 - b.waist - 2.5} ${Y.waist + 1}Z`
		});
		return null;
	}
	const s = SPAN[item.size] ?? 1;
	const W = 78 * s;
	const H = 96 * s;
	const shape = attr(spec, "Shape");
	const structure = attr(spec, "Structure");
	const symmetry = attr(spec, "Symmetry");
	const alpha = attr(spec, "Color") === "Translucent" ? Math.min(p.alpha, .62) : p.alpha;
	const skeletal = structure === "Skeletal frame";
	const ctx = {
		p,
		W,
		H,
		shape,
		fill: p.fabric,
		alpha: skeletal ? .08 : alpha
	};
	let root = {
		x: 5,
		y: ROOT_Y
	};
	let scale = 1;
	let tilt = 0;
	if (attachment === "Shoulder-mounted") root = {
		x: b.shoulder - 5,
		y: Y.shoulder + 6
	};
	if (attachment === "Arm-mounted") {
		const e = armAt(b, 1, .45);
		root = {
			x: e.x - 100,
			y: e.y
		};
		scale = .75;
		tilt = 25;
	}
	if (attachment === "Corset-integrated") root = {
		x: 8,
		y: Y.waist - 8
	};
	const float = attachment === "Floating illusion" || structure === "Floating panels" ? 9 : 0;
	const one = (side, variant = "main", extraRot = 0, extraScale = 1) => {
		const asym = symmetry === "Asymmetrical" && side === -1;
		const sc = scale * extraScale * (asym ? .82 : 1);
		const rot = tilt + extraRot + (asym ? 12 : 0);
		const type = variant === "mismatch" ? item.type === "Butterfly wings" ? "Feather wings" : "Butterfly wings" : item.type;
		const c = variant === "mismatch" ? {
			...ctx,
			fill: p.fabric2
		} : ctx;
		const tiers = structure === "Multi-tiered" ? [
			1,
			.78,
			.58
		] : [1];
		return /* @__PURE__ */ jsx("g", {
			transform: `translate(${100 + side * (root.x + float)} ${root.y}) scale(${side * sc} ${sc}) rotate(${rot})`,
			children: /* @__PURE__ */ jsxs("g", {
				className: MOTION[attr(spec, "Movement")] ?? "",
				style: { transformOrigin: "0px 0px" },
				children: [
					structure === "Double pair" && /* @__PURE__ */ jsx("g", {
						transform: "rotate(58) scale(0.62)",
						"data-art": "wings.structure.double-pair",
						children: /* @__PURE__ */ jsx(WingShape, {
							c,
							type
						})
					}),
					symmetry === "Multi-directional" && /* @__PURE__ */ jsx("g", {
						transform: "rotate(115) scale(0.55)",
						"data-art": "wings.symmetry.multi-directional",
						children: /* @__PURE__ */ jsx(WingShape, {
							c,
							type
						})
					}),
					tiers.map((k, i) => /* @__PURE__ */ jsx("g", {
						transform: `rotate(${-i * 14}) scale(${k})`,
						"data-art": i ? "wings.structure.multi-tiered" : artKey("wings", "shape", shape),
						children: /* @__PURE__ */ jsx(WingShape, {
							c,
							type
						})
					}, i)),
					skeletal && /* @__PURE__ */ jsx("g", {
						"data-art": "wings.structure.skeletal-frame",
						children: ["#2b1b33", p.metal].map((col, j) => /* @__PURE__ */ jsx("path", {
							d: `M0 0Q${W * .05} ${-H * .95} ${W * .92} ${-H * 1.02}` + [
								.2,
								.45,
								.7
							].map((u) => `M${W * .9 * u} ${-H * u - 6}L${W * (.25 + u * .6)} ${H * .35}`).join(""),
							stroke: col,
							strokeWidth: j ? 1.3 : 2.3,
							fill: "none",
							strokeLinecap: "round"
						}, j))
					}),
					structure === "Segmented" && /* @__PURE__ */ jsx(Line, {
						d: [
							-70,
							-40,
							-10,
							20
						].map((d) => `M0 0L${Math.cos(rad(d)) * W * 1.3} ${Math.sin(rad(d)) * W * 1.3}`).join(""),
						c: "#fff6ec",
						w: 1.6,
						o: 1
					}),
					(spec.attrs["Surface Details"] ?? "None").split(", ").map((sd) => /* @__PURE__ */ jsx(Surface, {
						c,
						kind: sd
					}, sd)),
					(spec.attrs["Secondary Elements"] ?? "None").split(", ").map((se) => /* @__PURE__ */ jsx(Secondary, {
						c,
						kind: se
					}, se)),
					spec.signature === "Jewel at root" && /* @__PURE__ */ jsx(MotifArt, {
						kind: "gem",
						x: W * .2,
						y: -H * .12,
						s: .5,
						fill: p.accent,
						filter: `url(#${p.uid}-glow)`
					}),
					spec.signature === "Trailing plumes" && /* @__PURE__ */ jsx(Secondary, {
						c,
						kind: "Trailing feathers"
					}),
					spec.signature === "Sparkle trail" && Array.from({ length: 6 }, (_, i) => /* @__PURE__ */ jsx(Sparkle, {
						x: W * (.9 + i * .08),
						y: -H * .7 + i * H * .25,
						s: 1.6 + i % 3,
						glow: `url(#${p.uid}-glow)`
					}, i))
				]
			})
		});
	};
	const sides = [];
	if (symmetry !== "One-winged") sides.push(/* @__PURE__ */ jsx("g", { children: one(-1, symmetry === "Mismatched" ? "mismatch" : "main") }, "l"));
	sides.push(/* @__PURE__ */ jsx("g", { children: one(1) }, "r"));
	return /* @__PURE__ */ jsxs(Art, {
		k: `wings.type.${item.type.toLowerCase().replace(/\s+/g, "-")}`,
		"data-attachment": attachment,
		children: [
			spec.signature === "Halo ring" && /* @__PURE__ */ jsxs(Art, {
				k: "wings.signature.halo-ring",
				children: [/* @__PURE__ */ jsx("ellipse", {
					cx: 100,
					cy: HEAD.cy - 16,
					rx: 23,
					ry: 23,
					fill: "none",
					stroke: "#2b1b33",
					strokeWidth: 3.2
				}), /* @__PURE__ */ jsx("ellipse", {
					cx: 100,
					cy: HEAD.cy - 16,
					rx: 23,
					ry: 23,
					fill: "none",
					stroke: p.metal,
					strokeWidth: 2,
					filter: `url(#${p.uid}-glow)`
				})]
			}),
			sides,
			float > 0 && /* @__PURE__ */ jsx(Art, {
				k: "wings.attachment.floating-illusion",
				children: [-1, 1].map((sd) => /* @__PURE__ */ jsx(Sparkle, {
					x: 100 + sd * (root.x + 4),
					y: root.y - 3,
					s: 2,
					glow: `url(#${p.uid}-glow)`
				}, sd))
			})
		]
	});
}
//#endregion
//#region app/components/garments/Garment.tsx
var RENDER = {
	wings: Wings,
	shoes: Shoes,
	bottoms: Bottoms,
	tops: Top,
	dresses: Dress,
	jewelry: Jewelry,
	coats: Coat,
	bags: Bag
};
var ALPHA = {
	Opaque: [1, 1],
	Sheer: [.74, .74],
	Translucent: [.58, .58],
	Transparent: [.4, .4],
	Mixed: [1, .5]
};
var PATTERN_SCALE = {
	Tiny: .6,
	Medium: 1,
	Oversized: 1.8,
	"All-over": 1.25
};
var typeSlug = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
function makePaint(item, b, uid, part, mannequin = false) {
	const spec = specOf(item);
	const dHue = item.hue - item.baseHue;
	const P = {
		h: item.hue,
		s: item.sat,
		l: item.light
	};
	const [alpha, alphaMixed] = ALPHA[spec.universal.Transparency] ?? [1, 1];
	const finishWord = spec.universal.Finish;
	let n = 0;
	return {
		uid,
		seq: () => `${uid}-c${n++}`,
		item,
		spec,
		b,
		r: rng(hashString(`${item.id}|${part}|${b.type}`)),
		fabric: `url(#${uid}-fab)`,
		fabric2: `url(#${uid}-fab2)`,
		primary: hsl$1(P),
		secondary: hsl$1(spec.secondary, 1, dHue),
		accent: hsl$1(spec.accent, 1, dHue),
		metal: hsl$1({
			...spec.accent,
			...metalHsl(spec.metal)
		}),
		dark: hsl$1({
			h: P.h,
			s: Math.min(90, P.s + 5),
			l: Math.max(8, P.l - 24)
		}),
		light: hsl$1({
			h: P.h,
			s: P.s * .7,
			l: Math.min(96, P.l + 26)
		}),
		pool: hsl$1({
			h: P.h + 12,
			s: Math.min(85, P.s + 10),
			l: Math.max(10, P.l - 30)
		}),
		alpha: finishWord === "Translucent" ? Math.min(alpha, .62) : alpha,
		alphaMixed: finishWord === "Translucent" ? Math.min(alphaMixed, .62) : alphaMixed,
		finish: finishWord === "Matte" ? null : `url(#${uid}-fin)`,
		ex: level([
			"Subtle",
			"Standard",
			"Exaggerated",
			"Extreme couture"
		], spec.universal.Exaggeration),
		density: level([
			"Minimal",
			"Moderate",
			"Ornate",
			"Maximalist"
		], spec.universal["Detail density"]),
		mannequin
	};
}
function metalHsl(m) {
	const table = {
		gold: {
			h: 42,
			s: 78,
			l: 60
		},
		"rose gold": {
			h: 12,
			s: 65,
			l: 74
		},
		silver: {
			h: 220,
			s: 12,
			l: 82
		},
		chrome: {
			h: 215,
			s: 30,
			l: 92
		},
		gunmetal: {
			h: 230,
			s: 9,
			l: 40
		},
		"antique brass": {
			h: 36,
			s: 42,
			l: 47
		}
	};
	return table[m] ?? table.silver;
}
/** Paint servers shared by one garment: fabrics, finish sheen, halftone shading, glow. */
function GarmentDefs({ p }) {
	const { uid, spec, item } = p;
	const scale = PATTERN_SCALE[spec.universal["Pattern scale"]] ?? 1;
	const finish = spec.universal.Finish;
	return /* @__PURE__ */ jsxs("defs", { children: [
		/* @__PURE__ */ jsx(PatternDef, {
			id: `${uid}-fab`,
			kind: spec.pattern,
			c1: p.primary,
			c2: p.secondary,
			c3: p.accent,
			hue: item.hue,
			scale
		}),
		/* @__PURE__ */ jsx(PatternDef, {
			id: `${uid}-fab2`,
			kind: ["gradient", "ombre"].includes(spec.pattern) ? spec.pattern : "solid",
			c1: p.secondary,
			c2: p.primary,
			c3: p.accent,
			hue: item.hue + 40,
			scale
		}),
		finish !== "Matte" && /* @__PURE__ */ jsxs("linearGradient", {
			id: `${uid}-fin`,
			"data-art": `finish.${finish.toLowerCase()}`,
			x1: "0",
			y1: "0",
			x2: "1",
			y2: "0.6",
			children: [
				finish === "Glossy" && /* @__PURE__ */ jsxs(Fragment, { children: [
					/* @__PURE__ */ jsx("stop", {
						offset: "0.12",
						stopColor: "#fff",
						stopOpacity: .6
					}),
					/* @__PURE__ */ jsx("stop", {
						offset: "0.3",
						stopColor: "#fff",
						stopOpacity: 0
					}),
					/* @__PURE__ */ jsx("stop", {
						offset: "0.8",
						stopColor: "#fff",
						stopOpacity: 0
					}),
					/* @__PURE__ */ jsx("stop", {
						offset: "0.9",
						stopColor: "#fff",
						stopOpacity: .25
					})
				] }),
				finish === "Satin" && /* @__PURE__ */ jsxs(Fragment, { children: [
					/* @__PURE__ */ jsx("stop", {
						offset: "0.2",
						stopColor: "#fff",
						stopOpacity: 0
					}),
					/* @__PURE__ */ jsx("stop", {
						offset: "0.35",
						stopColor: "#fff",
						stopOpacity: .32
					}),
					/* @__PURE__ */ jsx("stop", {
						offset: "0.5",
						stopColor: "#fff",
						stopOpacity: 0
					}),
					/* @__PURE__ */ jsx("stop", {
						offset: "0.72",
						stopColor: "#fff",
						stopOpacity: .2
					}),
					/* @__PURE__ */ jsx("stop", {
						offset: "0.85",
						stopColor: "#fff",
						stopOpacity: 0
					})
				] }),
				finish === "Metallic" && /* @__PURE__ */ jsxs(Fragment, { children: [
					/* @__PURE__ */ jsx("stop", {
						offset: "0.1",
						stopColor: "#fff",
						stopOpacity: .7
					}),
					/* @__PURE__ */ jsx("stop", {
						offset: "0.3",
						stopColor: "#000",
						stopOpacity: .22
					}),
					/* @__PURE__ */ jsx("stop", {
						offset: "0.5",
						stopColor: "#fff",
						stopOpacity: .55
					}),
					/* @__PURE__ */ jsx("stop", {
						offset: "0.7",
						stopColor: "#000",
						stopOpacity: .25
					}),
					/* @__PURE__ */ jsx("stop", {
						offset: "0.9",
						stopColor: "#fff",
						stopOpacity: .45
					})
				] }),
				finish === "Iridescent" && [
					0,
					60,
					140,
					220,
					300
				].map((d, i) => /* @__PURE__ */ jsx("stop", {
					offset: i / 4,
					stopColor: `hsl(${(item.hue + d) % 360} 90% 80%)`,
					stopOpacity: .42
				}, i)),
				finish === "Translucent" && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("stop", {
					offset: "0",
					stopColor: "#fff",
					stopOpacity: .3
				}), /* @__PURE__ */ jsx("stop", {
					offset: "1",
					stopColor: "#fff",
					stopOpacity: 0
				})] })
			]
		}),
		/* @__PURE__ */ jsx("pattern", {
			id: `${uid}-hatch`,
			"data-art": "finish.hatching",
			patternUnits: "userSpaceOnUse",
			width: 1.6,
			height: 1.6,
			patternTransform: "rotate(-35)",
			children: /* @__PURE__ */ jsx("path", {
				d: "M0 0.8H1.6",
				stroke: INK,
				strokeWidth: .28
			})
		}),
		/* @__PURE__ */ jsxs("linearGradient", {
			id: `${uid}-shadeg`,
			gradientUnits: "userSpaceOnUse",
			x1: 100,
			y1: 0,
			x2: 170,
			y2: 40,
			children: [/* @__PURE__ */ jsx("stop", {
				offset: "0",
				stopColor: "#fff",
				stopOpacity: 0
			}), /* @__PURE__ */ jsx("stop", {
				offset: "1",
				stopColor: "#fff",
				stopOpacity: .55
			})]
		}),
		/* @__PURE__ */ jsx("filter", {
			id: `${uid}-soft`,
			x: "-20%",
			y: "-20%",
			width: "140%",
			height: "140%",
			children: /* @__PURE__ */ jsx("feGaussianBlur", { stdDeviation: 1.5 })
		}),
		/* @__PURE__ */ jsx("mask", {
			id: `${uid}-shade`,
			maskUnits: "userSpaceOnUse",
			x: -300,
			y: -300,
			width: 900,
			height: 1e3,
			children: /* @__PURE__ */ jsx("rect", {
				x: -300,
				y: -300,
				width: 900,
				height: 1e3,
				fill: `url(#${uid}-shadeg)`
			})
		}),
		/* @__PURE__ */ jsxs("filter", {
			id: `${uid}-glow`,
			x: "-50%",
			y: "-50%",
			width: "200%",
			height: "200%",
			children: [/* @__PURE__ */ jsx("feGaussianBlur", {
				in: "SourceGraphic",
				stdDeviation: 1.4,
				result: "b"
			}), /* @__PURE__ */ jsxs("feMerge", { children: [
				/* @__PURE__ */ jsx("feMergeNode", { in: "b" }),
				/* @__PURE__ */ jsx("feMergeNode", { in: "b" }),
				/* @__PURE__ */ jsx("feMergeNode", { in: "SourceGraphic" })
			] })]
		})
	] });
}
/**
* Hand-drawn override: register `garment.<category>.<type-slug>` in lib/assets.ts with a `src`
* (may contain `{body}` → long | hourglass | pear). Draw it grayscale on the 200×400 doll canvas;
* it's tinted with the item's primary color by multiply.
*/
function HandDrawn({ p, src }) {
	const href = `/${src.replace("{body}", p.b.type)}`;
	return /* @__PURE__ */ jsxs("g", {
		"data-art": `garment.${p.item.category}.${typeSlug(p.item.type)}`,
		children: [/* @__PURE__ */ jsxs("filter", {
			id: `${p.uid}-tint`,
			colorInterpolationFilters: "sRGB",
			children: [
				/* @__PURE__ */ jsx("feFlood", {
					floodColor: p.primary,
					result: "c"
				}),
				/* @__PURE__ */ jsx("feBlend", {
					in: "SourceGraphic",
					in2: "c",
					mode: "multiply",
					result: "m"
				}),
				/* @__PURE__ */ jsx("feComposite", {
					in: "m",
					in2: "SourceAlpha",
					operator: "in"
				})
			]
		}), /* @__PURE__ */ jsx("image", {
			href,
			x: 0,
			y: 0,
			width: 200,
			height: 400,
			filter: `url(#${p.uid}-tint)`
		})]
	});
}
function Garment({ item, body, part, mannequin = false }) {
	const uid = `g${useId().replace(/[^a-zA-Z0-9]/g, "")}${part[0]}`;
	applyBody(body);
	const p = makePaint(item, BODIES[body], uid, part, mannequin);
	const override = asset(`garment.${item.category}.${typeSlug(item.type)}`).src;
	const Comp = RENDER[item.category];
	return /* @__PURE__ */ jsxs("g", {
		"data-item": item.id,
		"data-category": item.category,
		"data-part": part,
		children: [/* @__PURE__ */ jsx(GarmentDefs, { p }), override ? part === "front" && /* @__PURE__ */ jsx(HandDrawn, {
			p,
			src: override
		}) : /* @__PURE__ */ jsx(Comp, {
			p,
			part
		})]
	});
}
//#endregion
//#region app/components/Avatar.tsx
/**
* Paper doll drawn in CLAMP colour-illustration style: ~7 heads tall, long legs, slim tapered
* limbs, long hands, big almond eyes, hair in pointed clumps with fine strand lines (or ringlets).
* Layers, back to front:
*   item back parts (wings, capes, trains, hoods, backpacks) · hair-back · body · face ·
*   shoes · bottoms · tops · dresses · jewelry · coats · bags · side locks · bangs
* Each <g data-layer="..."> is a swap point for hand-drawn art.
* viewBox is 200×400; body geometry lives in lib/body.ts and is shared with every garment.
*/
var SKIN = "#ffe8da";
/** Hard cel-shadow tone (warm peach, reference: references/face/Iria.jpg). */
var SKIN_SHADE = "#f0b49c";
var MANNEQUIN = "#f3ecf8";
var MANNEQUIN_SHADE = "#dccfe8";
var LINE = "#2b1b33";
var T = 0;
var RX = 0;
var HR = 0;
var TH = 0;
var HAIR_END = {
	short: 0,
	bob: 0,
	medium: 0,
	long: 0
};
var LOCK_END = {
	short: 0,
	bob: 0,
	medium: 0,
	long: 0
};
var BANG_END = {
	short: 0,
	medium: 0,
	long: 0
};
/** Eye centres sit about one eye-width apart. */
var EYE_DX = 11;
onTune(() => {
	T = HEAD.cy - HEAD.ry;
	RX = HEAD.rx;
	HR = HEAD.rx + HAIR.width;
	TH = T - HAIR.volume;
	HAIR_END = {
		short: HAIR.shortEnd,
		bob: HAIR.bobEnd,
		medium: HAIR.mediumEnd,
		long: HAIR.longEnd
	};
	LOCK_END = {
		short: 0,
		bob: HAIR.lockBob,
		medium: HAIR.lockMedium,
		long: HAIR.lockLong
	};
	BANG_END = {
		short: HAIR.bangShort,
		medium: HAIR.bangMedium,
		long: HAIR.bangLong
	};
	EYE_DX = FACE.eyeDX;
});
function hexHsl(hex) {
	const n = parseInt(hex.replace("#", ""), 16);
	const r = (n >> 16 & 255) / 255;
	const g = (n >> 8 & 255) / 255;
	const b = (n & 255) / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	const d = max - min;
	let h = 0;
	let s = 0;
	if (d) {
		s = d / (1 - Math.abs(2 * l - 1));
		h = max === r ? (g - b) / d % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
	}
	return {
		h: (h * 60 + 360) % 360,
		s: s * 100,
		l: l * 100
	};
}
var hsl = (h, s, l) => `hsl(${Math.round(h)} ${Math.round(Math.max(0, Math.min(100, s)))}% ${Math.round(Math.max(0, Math.min(100, l)))}%)`;
/** Dense samples along the same Catmull-Rom curve `curve()` draws (for ringlet outlines). */
function densify(pts, closed = true, per = 6) {
	const n = pts.length;
	const get = (i) => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
	const out = [];
	const segs = closed ? n : n - 1;
	for (let i = 0; i < segs; i++) {
		const p0 = get(i - 1);
		const p1 = get(i);
		const p2 = get(i + 1);
		const p3 = get(i + 2);
		const k = .5 / 3;
		const c1 = p1.c ? p1 : {
			x: p1.x + (p2.x - p0.x) * k,
			y: p1.y + (p2.y - p0.y) * k
		};
		const c2 = p2.c ? p2 : {
			x: p2.x - (p3.x - p1.x) * k,
			y: p2.y - (p3.y - p1.y) * k
		};
		for (let s = 0; s < per; s++) {
			const t = s / per;
			const u = 1 - t;
			out.push({
				x: u * u * u * p1.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p2.x,
				y: u * u * u * p1.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p2.y
			});
		}
	}
	if (!closed) out.push(pts[n - 1]);
	return out;
}
/** Curly hair: the outline becomes a chain of outward ringlet bumps of radius r. */
function ringlets(pts, r) {
	const dense = densify(pts, true, 8);
	const lens = [0];
	for (let i = 1; i <= dense.length; i++) {
		const a = dense[i - 1];
		const b = dense[i % dense.length];
		lens.push(lens[i - 1] + Math.hypot(b.x - a.x, b.y - a.y));
	}
	const total = lens[lens.length - 1];
	const n = Math.max(6, Math.round(total / (2 * r)));
	const q = [];
	for (let k = 0; k < n; k++) {
		const target = total * k / n;
		let i = 1;
		while (i < lens.length - 1 && lens[i] < target) i++;
		const a = dense[i - 1];
		const b = dense[i % dense.length];
		const t = (target - lens[i - 1]) / (lens[i] - lens[i - 1] || 1);
		q.push({
			x: a.x + (b.x - a.x) * t,
			y: a.y + (b.y - a.y) * t
		});
	}
	let area = 0;
	for (let i = 0; i < q.length; i++) {
		const a = q[i];
		const b = q[(i + 1) % q.length];
		area += a.x * b.y - b.x * a.y;
	}
	const sweep = area > 0 ? 1 : 0;
	const rr = (r * 1.08).toFixed(2);
	return `M${q[0].x.toFixed(1)} ${q[0].y.toFixed(1)}` + q.map((_, i) => {
		const b = q[(i + 1) % q.length];
		return `A${rr} ${rr} 0 0 ${sweep} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
	}).join("") + "Z";
}
/**
* Lower edge of pointed hair clumps from x0 → x1. Tips vary in length and lean slightly,
* like CLAMP's hand-drawn strands rather than a regular sawtooth.
*/
function clumps(x0, x1, tipY, gap, n) {
	const out = [];
	const jitter = [
		0,
		1.6,
		-.8,
		2.4,
		.6,
		-1.4,
		1.9,
		-.2,
		1.1,
		-1.8,
		.9,
		2.1,
		-.5
	];
	for (let i = 0; i <= n; i++) {
		const x = x0 + (x1 - x0) * i / n;
		const tip = i % 2 === 0;
		const j = jitter[i % jitter.length];
		out.push(tip ? pt(x + j * .4, tipY(x) + j, true) : pt(x, tipY(x) - gap * (.6 + Math.abs(j) * .2)));
	}
	return out;
}
var mirrorClosed = (R) => [...R, ...[...R].reverse().slice(1).map((q) => ({
	...q,
	x: 200 - q.x
}))];
function backHairPts(len) {
	const e = HAIR_END[len];
	const RX = HR;
	const crown = [
		pt(100, TH - 3),
		pt(114, TH - 1.5),
		pt(100 + RX + 2.5, T + 10)
	];
	if (len === "short") return mirrorClosed([
		...crown,
		pt(100 + RX + 3.2, Y.eyes),
		pt(100 + RX + 2, Y.eyes + 10),
		...clumps(100 + RX + 1.5, 108, (x) => e - (x - 100) * .15, 4, 6)
	]);
	if (len === "bob") return mirrorClosed([
		...crown,
		pt(100 + RX + 4.5, Y.eyes),
		pt(100 + RX + 5.5, Y.chin - 6),
		...clumps(100 + RX + 6, 108, (x) => e - (x - 100 - 8) * .12, 5, 8)
	]);
	const span = e - Y.shoulder;
	return mirrorClosed([
		...crown,
		pt(100 + RX + 4.5, Y.eyes),
		pt(100 + RX + 6, Y.chin),
		pt(100 + RX + 12, Y.shoulder),
		pt(100 + RX + 16, Y.shoulder + span * .35),
		pt(100 + RX + 12, Y.shoulder + span * .65),
		pt(100 + RX + 16, e - 16),
		...clumps(100 + RX + 19, 112, (x) => e - (x - 100 - 12) * .3, 10, 8)
	]);
}
function sideLockPts(len) {
	const RX = HR;
	const end = LOCK_END[len];
	if (!end) return [];
	return [-1, 1].map((s) => [
		pt(100 + s * (RX - 2), T + 12),
		pt(100 + s * (RX + 2.5), Y.eyes),
		pt(100 + s * (RX + 3), end - 16),
		pt(100 + s * (RX + 5), end, true),
		pt(100 + s * (RX + .5), end - 12),
		pt(100 + s * (RX - .5), end - 4, true),
		pt(100 + s * (RX - 1.5), end - 22),
		pt(100 + s * (RX - 2.5), Y.eyes + 4)
	]);
}
function bangPts(style, len) {
	const end = BANG_END[len];
	const L = 100 - HR + .5;
	const R = 100 + HR - .5;
	const crown = [
		pt(L, Y.eyes - 1),
		pt(L + .5, T + 10),
		pt(88, TH + 1),
		pt(100, TH - 2),
		pt(112, TH + 1),
		pt(R - .5, T + 10),
		pt(R, Y.eyes - 1)
	];
	switch (style) {
		case "blunt": return [...crown, ...clumps(R, L, () => end, 4, 12)];
		case "side": return [
			...crown,
			pt(R, T + 18, true),
			...clumps(R - 1.5, L, (x) => end - 9 + (R - 1.5 - x) * .32, 5, 10)
		];
		default: return [
			...crown,
			...clumps(R, 104, (x) => end + 4 - (R - x) * .5, 6, 4),
			pt(101, T + 6, true),
			pt(99, T + 6, true),
			...clumps(96, L, (x) => end + 4 - (x - L) * .5, 6, 4)
		];
	}
}
/** Fine strand lines (straight) or little curls (curly) inside the back hair. */
function backTexture(len, curly) {
	const e = HAIR_END[len];
	if (curly) {
		let d = "";
		for (let i = 0; i < 26; i++) {
			const s = i % 2 ? 1 : -1;
			const x = 100 + s * (6 + i * 7 % 22);
			const y = T + 8 + i * 37 % Math.max(10, e - T - 10);
			d += `M${x} ${y}c${s * 2.4} -2.6 ${s * 5} 0 ${s * 2.6} 2.6c${-s * 1.6} 1.6 ${-s * 2.8} -0.4 ${-s * 1.4} -1.4`;
		}
		return d;
	}
	let d = "";
	for (let i = 0; i < 9; i++) for (const s of [-1, 1]) {
		const x0 = 100 + s * (8 + i * 1.6);
		const x1 = 100 + s * (len === "short" || len === "bob" ? 16 + i * 1.2 : 22 + i * 1.8);
		const y1 = e - 6 - i * 7 % 17;
		d += `M${x0} ${T + 4 + i}C${x0 + s * 16} ${Y.eyes} ${x1 + s * 4} ${(Y.eyes + y1) / 2} ${x1} ${y1}`;
	}
	return d;
}
/** Full-figure and face close-up views (same 1:2 aspect as the doll canvas). */
var VIEW_FULL = [
	0,
	0,
	200,
	400
];
var viewFace = () => [
	70,
	HEAD.cy - HEAD.ry - 10,
	60,
	120
];
/** Smoothly animates the SVG viewBox between the full figure and the face close-up. */
function useZoomView(zoomed) {
	const [vb, setVb] = useState(VIEW_FULL);
	const from = useRef(VIEW_FULL);
	useEffect(() => {
		const start = performance.now();
		const a = from.current;
		const b = zoomed ? viewFace() : VIEW_FULL;
		const dur = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0 : 480;
		let raf = 0;
		const step = (now) => {
			const t = dur ? Math.min(1, (now - start) / dur) : 1;
			const e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
			const cur = a.map((v, i) => v + (b[i] - v) * e);
			from.current = cur;
			setVb(cur);
			if (t < 1) raf = requestAnimationFrame(step);
		};
		raf = requestAnimationFrame(step);
		return () => cancelAnimationFrame(raf);
	}, [zoomed]);
	return vb.map((v) => v.toFixed(2)).join(" ");
}
/**
* Face outline after references/face/Iria.jpg: widest at the cheekbones just under the eyes,
* then a long, nearly straight jawline in a V down to a narrow chin with a tiny flat tip.
*/
function facePath() {
	const cw = RX + FACE.cheekW;
	const cheekY = HEAD.cy + FACE.cheekY;
	const tip = FACE.chinTip;
	const jaw = FACE.jaw;
	return `M${100 - RX + .5} ${HEAD.cy - 10}C${100 - RX} ${T + 4} 90 ${T} 100 ${T}C110 ${T} ${100 + RX} ${T + 4} ${100 + RX - .5} ${HEAD.cy - 10}C${100 + RX} ${HEAD.cy - 4} ${100 + cw + .4} ${cheekY - 4} ${100 + cw} ${cheekY}C${100 + cw - .8} ${cheekY + 10} ${100 + tip + jaw} ${Y.chin - 6} ${100 + tip} ${Y.chin}L${100 - tip} ${Y.chin}C${100 - tip - jaw} ${Y.chin - 6} ${100 - cw + .8} ${cheekY + 10} ${100 - cw} ${cheekY}C${100 - cw - .4} ${cheekY - 4} ${100 - RX} ${HEAD.cy - 4} ${100 - RX + .5} ${HEAD.cy - 10}Z`;
}
/** Right-side outline of neck/torso + outer leg, then inner leg back up (relative x). */
function bodyOutline(b) {
	const outer = [
		pt(b.neck, Y.chin - 4),
		pt(b.neck, Y.neck),
		pt(b.neck + 3, Y.neck + 3),
		pt(b.shoulder - 7, Y.shoulder - 3),
		pt(b.shoulder, Y.shoulder + 2),
		pt(b.shoulder - 1.5, Y.shoulder + 10),
		...[
			Y.bust,
			Y.underbust,
			Y.waist - 12,
			Y.waist,
			Y.highHip,
			Y.hip,
			Y.crotch + 10,
			Y.thigh,
			Y.thigh + 20,
			Y.knee,
			Y.calf,
			Y.calf + 22
		].map((y) => pt(torsoHalf(b, y), y)),
		pt(b.legOuter.ankle, Y.ankle)
	];
	const inner = [
		pt(b.legInner.ankle, Y.ankle),
		...[
			Y.calf + 22,
			Y.calf,
			Y.knee,
			Y.thigh + 20,
			Y.thigh,
			Y.crotch + 12
		].map((y) => pt(legInnerAt(b, y), y)),
		pt(1.2, Y.crotch + 2)
	];
	const R = [...outer, ...inner];
	const L = [...R].reverse().map((q) => ({
		...q,
		x: 100 - q.x
	}));
	return curve([
		...R.map((q) => ({
			...q,
			x: 100 + q.x
		})),
		pt(100, Y.crotch - 1),
		...L
	]);
}
/** Long slender hand continuing the forearm, with a thumb and finger separations. */
function hand(b, s) {
	const w = armAt(b, s, 1);
	const q = armAt(b, s, .9);
	const len = Math.hypot(w.x - q.x, w.y - q.y) || 1;
	const d = {
		x: (w.x - q.x) / len,
		y: (w.y - q.y) / len
	};
	const n = armNormal(b, s, 1);
	const K = LIMB.hand;
	const P = (a, c) => pt(w.x + d.x * a * K + n.x * c * K, w.y + d.y * a * K + n.y * c * K);
	const outline = curve([
		P(-1, -2.4),
		P(-1, 2.4),
		P(5, 2.8),
		P(11, 1.4),
		P(13, .2),
		P(12, -1.2),
		P(7, -2.2),
		P(5, -3.6),
		P(3.5, -3.2),
		P(2, -2.3)
	]);
	const f = [
		P(6, 1.6),
		P(11.5, 1),
		P(6, .2),
		P(12.2, -.1),
		P(6, -1.2),
		P(11, -1.2)
	];
	return {
		outline,
		lines: `M${f[0].x} ${f[0].y}L${f[1].x} ${f[1].y}M${f[2].x} ${f[2].y}L${f[3].x} ${f[3].y}M${f[4].x} ${f[4].y}L${f[5].x} ${f[5].y}`
	};
}
/**
* 90s OVA eye (reference: references/face/Iria.jpg): narrow almond, a heavy upper lid that slants
* down to a tapered outer flick and cuts off the top of the iris, white showing on both sides,
* a strong lower lash on the outer half, one sharp highlight.
*/
function Eye({ x, flip, uid, brows }) {
	const s = flip ? -1 : 1;
	const y = Y.eyes + FACE.eyeY;
	const id = `${uid}-eye${flip ? "r" : "l"}`;
	const shape = `M${x - s * 5} ${y + .9}C${x - s * 3.2} ${y - 3.3} ${x + s * 2} ${y - 4.3} ${x + s * 5.4} ${y - .2}C${x + s * 3.4} ${y + 3} ${x - s * 2} ${y + 3.9} ${x - s * 5} ${y + .9}Z`;
	return /* @__PURE__ */ jsxs("g", {
		"data-layer": "face.eye",
		transform: `translate(${x} ${y}) scale(${FACE.eyeScale} ${FACE.eyeScale * FACE.eyeOpen}) translate(${-x} ${-y})`,
		children: [
			/* @__PURE__ */ jsx("clipPath", {
				id,
				children: /* @__PURE__ */ jsx("path", { d: shape })
			}),
			/* @__PURE__ */ jsx("path", {
				d: shape,
				fill: "#fbf8fb"
			}),
			/* @__PURE__ */ jsxs("g", {
				clipPath: `url(#${id})`,
				children: [
					/* @__PURE__ */ jsx("circle", {
						cx: x + s * .4,
						cy: y - .3,
						r: FACE.irisR,
						fill: `url(#${uid}-iris)`,
						stroke: LINE,
						strokeWidth: .35
					}),
					/* @__PURE__ */ jsx("circle", {
						cx: x + s * .4,
						cy: y - .3,
						r: FACE.irisR * .4,
						fill: LINE,
						opacity: .9
					}),
					/* @__PURE__ */ jsx("path", {
						d: `M${x - s * 6} ${y - 4}L${x + s * 6} ${y - 4}L${x + s * 6} ${y - 1.4}Q${x} ${y - .4} ${x - s * 6} ${y - .8}Z`,
						fill: LINE,
						opacity: .22
					}),
					/* @__PURE__ */ jsx("circle", {
						cx: x - s * .7,
						cy: y - 1.1,
						r: .8,
						fill: "#fff"
					}),
					/* @__PURE__ */ jsx("circle", {
						cx: x + s * 1.6,
						cy: y + 1.1,
						r: .32,
						fill: "#fff",
						opacity: .85
					})
				]
			}),
			/* @__PURE__ */ jsx("path", {
				d: `M${x - s * 5.3} ${y + 1.1}C${x - s * 3.4} ${y - 3.6} ${x + s * 2} ${y - 4.8} ${x + s * 5.6} ${y - .4}L${x + s * 7.4} ${y - 1.1}L${x + s * 5.4} ${y + .3}C${x + s * 2} ${y - 3.4} ${x - s * 3} ${y - 2.6} ${x - s * 5.3} ${y + 1.1}Z`,
				fill: LINE,
				stroke: LINE,
				strokeWidth: Math.max(0, (FACE.lidWeight - 1) * 1.2),
				opacity: Math.min(1, FACE.lidWeight)
			}),
			/* @__PURE__ */ jsx("path", {
				d: `M${x + s * 5.2} ${y + .2}C${x + s * 3.6} ${y + 3.2} ${x + s * .5} ${y + 3.7} ${x - s * 1.6} ${y + 3.1}`,
				fill: "none",
				stroke: LINE,
				strokeWidth: .75 * FACE.lowerLid,
				strokeLinecap: "round"
			}),
			/* @__PURE__ */ jsx("path", {
				d: `M${x - s * 1.6} ${y + 3.1}C${x - s * 3} ${y + 2.7} ${x - s * 4.2} ${y + 1.9} ${x - s * 4.8} ${y + 1.1}`,
				fill: "none",
				stroke: LINE,
				strokeWidth: .3 * FACE.lowerLid,
				strokeLinecap: "round",
				opacity: .7
			}),
			/* @__PURE__ */ jsx("path", {
				d: `M${x - s * 3.6} ${y - 3.3}C${x - s * 1} ${y - 5.4} ${x + s * 3} ${y - 5.2} ${x + s * 5.2} ${y - 2.8}`,
				fill: "none",
				stroke: LINE,
				strokeWidth: .28,
				strokeLinecap: "round",
				opacity: .55
			}),
			brows && /* @__PURE__ */ jsx("path", {
				transform: `translate(0 ${-FACE.browLift})`,
				d: `M${x - s * 4.4} ${y - 6.2}C${x - s * 1} ${y - 7.4} ${x + s * 3} ${y - 8.2} ${x + s * 6.4} ${y - 7.6}`,
				fill: "none",
				stroke: LINE,
				strokeWidth: FACE.browWeight,
				strokeLinecap: "round"
			})
		]
	});
}
function Avatar({ look, items = [], size = 240, mannequin = false, transitionName, zoomable = false }) {
	useTuneVersion();
	applyBody(look.body);
	const uid = `a${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
	const [zoomed, setZoomed] = useState(false);
	const viewBox = useZoomView(zoomable && zoomed);
	const b = BODIES[look.body];
	const curly = look.hairTexture === "curly";
	const hc = hexHsl(hairHex(look));
	const ec = hexHsl(eyeHex(look));
	const hair = hairHex(look);
	const hairDark = hsl(hc.h, hc.s * .95, hc.l * .55);
	const hairLight = hsl(hc.h, hc.s + 8, hc.l + 28);
	const skin = mannequin ? MANNEQUIN : SKIN;
	const shade = mannequin ? MANNEQUIN_SHADE : SKIN_SHADE;
	const ordered = CATEGORIES.flatMap((c) => items.filter((i) => i.category === c));
	const hands = [-1, 1].map((s) => hand(b, s));
	const backLen = look.backHair;
	const outline = (pts, r = 2.6) => curly ? ringlets(pts, r) : curve(pts);
	const backD = outline(backHairPts(backLen), 3);
	const bangD = outline(bangPts(look.bangs, look.bangLength), 2.4);
	const lockDs = sideLockPts(backLen).map((pts) => outline(pts, 2));
	const bangEnd = BANG_END[look.bangLength];
	return /* @__PURE__ */ jsxs("svg", {
		viewBox,
		width: size * .5,
		height: size,
		className: `avatar${zoomable ? " zoomable" : ""}${zoomable && zoomed ? " zoomed" : ""}`,
		style: transitionName ? { viewTransitionName: transitionName } : void 0,
		role: "img",
		"aria-label": mannequin ? "Mannequin" : zoomed ? "Avatar face close-up — tap to zoom out" : "Avatar",
		onClick: zoomable && zoomed ? (e) => {
			e.stopPropagation();
			setZoomed(false);
		} : void 0,
		children: [
			/* @__PURE__ */ jsxs("defs", { children: [
				/* @__PURE__ */ jsxs("linearGradient", {
					id: `${uid}-iris`,
					x1: "0",
					y1: "0",
					x2: "0",
					y2: "1",
					children: [
						/* @__PURE__ */ jsx("stop", {
							offset: "0",
							stopColor: hsl(ec.h, ec.s, ec.l * .35)
						}),
						/* @__PURE__ */ jsx("stop", {
							offset: "0.45",
							stopColor: eyeHex(look)
						}),
						/* @__PURE__ */ jsx("stop", {
							offset: "1",
							stopColor: hsl(ec.h, ec.s + 10, ec.l + 35)
						})
					]
				}),
				/* @__PURE__ */ jsxs("linearGradient", {
					id: `${uid}-skinshade`,
					x1: "0",
					y1: "0",
					x2: "1",
					y2: "0",
					children: [/* @__PURE__ */ jsx("stop", {
						offset: "0.74",
						stopColor: shade,
						stopOpacity: 0
					}), /* @__PURE__ */ jsx("stop", {
						offset: "0.74",
						stopColor: shade,
						stopOpacity: .5
					})]
				}),
				/* @__PURE__ */ jsxs("linearGradient", {
					id: `${uid}-hair`,
					x1: "0",
					y1: "0",
					x2: "0",
					y2: "1",
					children: [
						/* @__PURE__ */ jsx("stop", {
							offset: "0",
							stopColor: hairDark
						}),
						/* @__PURE__ */ jsx("stop", {
							offset: "0.25",
							stopColor: hair
						}),
						/* @__PURE__ */ jsx("stop", {
							offset: "1",
							stopColor: hairLight
						})
					]
				})
			] }),
			/* @__PURE__ */ jsx("g", {
				"data-layer": "items-back",
				children: ordered.map((it) => /* @__PURE__ */ jsx(Garment, {
					item: it,
					body: look.body,
					part: "back",
					mannequin
				}, `b${it.id}`))
			}),
			!mannequin && /* @__PURE__ */ jsxs("g", {
				"data-layer": `hair-back:${backLen}:${curly ? "curly" : "straight"}`,
				children: [
					/* @__PURE__ */ jsx("clipPath", {
						id: `${uid}-hairclip`,
						children: /* @__PURE__ */ jsx("path", { d: backD })
					}),
					/* @__PURE__ */ jsx("path", {
						fill: `url(#${uid}-hair)`,
						stroke: LINE,
						strokeWidth: .7,
						strokeLinejoin: "round",
						d: backD
					}),
					/* @__PURE__ */ jsx("path", {
						fill: "none",
						stroke: hairDark,
						strokeWidth: curly ? .45 : .35,
						opacity: .75,
						d: backTexture(backLen, curly),
						clipPath: `url(#${uid}-hairclip)`
					})
				]
			}),
			/* @__PURE__ */ jsxs("g", {
				"data-layer": `body:${look.body}`,
				stroke: LINE,
				strokeWidth: .7,
				strokeLinejoin: "round",
				children: [
					[-1, 1].map((s, i) => /* @__PURE__ */ jsxs("g", { children: [
						/* @__PURE__ */ jsx("path", {
							d: armTube(b, s, 0, 1, armHalf, 12),
							fill: skin
						}),
						/* @__PURE__ */ jsx("path", {
							d: hands[i].outline,
							fill: skin
						}),
						/* @__PURE__ */ jsx("path", {
							d: hands[i].lines,
							fill: "none",
							strokeWidth: .3,
							opacity: .6
						})
					] }, s)),
					[-1, 1].map((s) => /* @__PURE__ */ jsx("path", {
						d: curve(footPts(b, s)),
						fill: skin
					}, `f${s}`)),
					/* @__PURE__ */ jsx("path", {
						d: bodyOutline(b),
						fill: skin
					}),
					/* @__PURE__ */ jsx("path", {
						d: bodyOutline(b),
						fill: `url(#${uid}-skinshade)`,
						stroke: "none"
					}),
					/* @__PURE__ */ jsxs("g", {
						fill: "none",
						strokeWidth: .4,
						opacity: .6,
						children: [
							/* @__PURE__ */ jsx("path", { d: `M87 ${Y.shoulder + 3}Q93 ${Y.shoulder} 98 ${Y.shoulder + 4}M113 ${Y.shoulder + 3}Q107 ${Y.shoulder} 102 ${Y.shoulder + 4}` }),
							look.body !== "long" && /* @__PURE__ */ jsx("path", { d: `M${100 - b.bust * .7} ${Y.bust + 4}Q${100 - b.bust * .35} ${Y.bust + 9} 97.5 ${Y.bust + 4}M${100 + b.bust * .7} ${Y.bust + 4}Q${100 + b.bust * .35} ${Y.bust + 9} 102.5 ${Y.bust + 4}` }),
							/* @__PURE__ */ jsx("path", { d: `M100 ${Y.waist + 6}v2` }),
							/* @__PURE__ */ jsx("path", { d: `M${100 - (b.legOuter.knee + b.legInner.knee) / 2 - 2.5} ${Y.knee}q2.5 1.6 5 0M${100 + (b.legOuter.knee + b.legInner.knee) / 2 - 2.5} ${Y.knee}q2.5 1.6 5 0` })
						]
					}),
					!mannequin && /* @__PURE__ */ jsx("path", {
						"data-layer": "body.neck-shadow",
						d: `M${100 - b.neck} ${Y.chin - 4}Q100 ${Y.chin + 4} ${100 + b.neck} ${Y.chin - 4}L${100 + b.neck} ${Y.chin + 2}Q101 ${Y.chin + 8} ${100 - b.neck} ${Y.chin + 3}Z`,
						fill: shade,
						stroke: "none"
					}),
					mannequin ? /* @__PURE__ */ jsx("ellipse", {
						cx: 100,
						cy: HEAD.cy + 2,
						rx: 15,
						ry: 23,
						fill: skin
					}) : /* @__PURE__ */ jsxs(Fragment, { children: [
						/* @__PURE__ */ jsx("ellipse", {
							cx: 100 - RX + .5,
							cy: Y.eyes + FACE.earY,
							rx: 2.3,
							ry: 4.2,
							fill: skin
						}),
						/* @__PURE__ */ jsx("ellipse", {
							cx: 100 + RX - .5,
							cy: Y.eyes + FACE.earY,
							rx: 2.3,
							ry: 4.2,
							fill: shade
						}),
						/* @__PURE__ */ jsx("clipPath", {
							id: `${uid}-face`,
							children: /* @__PURE__ */ jsx("path", { d: facePath() })
						}),
						/* @__PURE__ */ jsx("path", {
							d: facePath(),
							fill: skin
						}),
						/* @__PURE__ */ jsx("path", {
							"data-layer": "face.cel-shadow",
							transform: `translate(${FACE.shadowX} 0)`,
							clipPath: `url(#${uid}-face)`,
							d: `M108 ${T}C113 ${HEAD.cy - 7} 113.5 ${HEAD.cy + 5} 109 ${HEAD.cy + 13}C106 ${HEAD.cy + 19} 102 ${Y.chin - 4} 99 ${Y.chin + 2}L${100 + RX + 4} ${Y.chin + 2}L${100 + RX + 4} ${T}Z`,
							fill: shade,
							stroke: "none"
						}),
						/* @__PURE__ */ jsx("path", {
							d: facePath(),
							fill: "none"
						})
					] })
				]
			}),
			!mannequin && /* @__PURE__ */ jsxs("g", {
				"data-layer": "face",
				children: [
					/* @__PURE__ */ jsx("ellipse", {
						cx: 89,
						cy: Y.eyes + 8,
						rx: 4,
						ry: 1.5,
						fill: "#ff8f8f",
						opacity: FACE.blush
					}),
					/* @__PURE__ */ jsx(Eye, {
						x: 100 - EYE_DX,
						flip: true,
						uid,
						brows: true
					}),
					/* @__PURE__ */ jsx(Eye, {
						x: 100 + EYE_DX,
						flip: false,
						uid,
						brows: true
					}),
					/* @__PURE__ */ jsxs("g", {
						"data-layer": "face.nose",
						transform: `translate(0 ${FACE.noseY})`,
						children: [
							/* @__PURE__ */ jsx("path", {
								d: `M100.6 ${Y.eyes + 3}L${100.6 + FACE.noseShadow} ${Y.eyes + 10.4}L100.3 ${Y.eyes + 11.2}Z`,
								fill: shade
							}),
							/* @__PURE__ */ jsx("path", {
								d: `M99.6 ${Y.eyes + 2.6}Q99.8 ${Y.eyes + 6} 100.3 ${Y.eyes + 9}`,
								fill: "none",
								stroke: LINE,
								strokeWidth: .25,
								opacity: .4
							}),
							/* @__PURE__ */ jsx("path", {
								d: `M98.7 ${Y.eyes + 11.4}Q100.4 ${Y.eyes + 12.4} 102.2 ${Y.eyes + 11}`,
								fill: "none",
								stroke: LINE,
								strokeWidth: .45,
								strokeLinecap: "round"
							})
						]
					}),
					/* @__PURE__ */ jsxs("g", {
						"data-layer": "face.mouth",
						transform: `translate(100 ${FACE.mouthY}) scale(${FACE.mouthW / 2.6} 1) translate(-100 0)`,
						children: [
							/* @__PURE__ */ jsx("path", {
								d: `M97.4 ${Y.eyes + 16.3}Q100 ${Y.eyes + 16.9} 102.6 ${Y.eyes + 16.1}`,
								stroke: LINE,
								fill: "none",
								strokeWidth: .55,
								strokeLinecap: "round"
							}),
							/* @__PURE__ */ jsx("path", {
								d: `M98.3 ${Y.eyes + 17.9}Q100 ${Y.eyes + 19.6} 101.9 ${Y.eyes + 17.8}Q100 ${Y.eyes + 18.6} 98.3 ${Y.eyes + 17.9}Z`,
								fill: shade
							}),
							/* @__PURE__ */ jsx("path", {
								d: `M98.6 ${Y.eyes + 17.4}Q100 ${Y.eyes + 17.8} 101.4 ${Y.eyes + 17.4}`,
								stroke: "#d77a7a",
								fill: "none",
								strokeWidth: .35,
								strokeLinecap: "round",
								opacity: .6
							})
						]
					})
				]
			}),
			/* @__PURE__ */ jsx("g", {
				"data-layer": "items-front",
				children: ordered.map((it) => /* @__PURE__ */ jsx(Garment, {
					item: it,
					body: look.body,
					part: "front",
					mannequin
				}, `f${it.id}`))
			}),
			!mannequin && /* @__PURE__ */ jsxs("g", {
				"data-layer": `bangs:${look.bangs}:${look.bangLength}`,
				children: [
					lockDs.map((d, i) => /* @__PURE__ */ jsx("path", {
						d,
						fill: `url(#${uid}-hair)`,
						stroke: LINE,
						strokeWidth: .6,
						strokeLinejoin: "round"
					}, i)),
					/* @__PURE__ */ jsx("path", {
						fill: `url(#${uid}-hair)`,
						stroke: LINE,
						strokeWidth: .7,
						strokeLinejoin: "round",
						d: bangD
					}),
					!curly && /* @__PURE__ */ jsx("path", {
						d: Array.from({ length: 11 }, (_, i) => {
							const x = 83 + i * 3.4;
							return `M${100 + (x - 100) * .3} ${T}Q${x} ${T + 5} ${x + (x < 100 ? -1 : 1)} ${bangEnd - 6}`;
						}).join(""),
						fill: "none",
						stroke: hairDark,
						strokeWidth: .3,
						opacity: .7
					}),
					curly && /* @__PURE__ */ jsx("path", {
						d: Array.from({ length: 7 }, (_, i) => {
							return `M${87 + i * 4.3} ${T + 6 + i % 2 * 4}c1.6 -2 3.8 0 2 2c-1.2 1.2 -2.2 -0.3 -1 -1`;
						}).join(""),
						fill: "none",
						stroke: hairDark,
						strokeWidth: .4,
						opacity: .75
					}),
					/* @__PURE__ */ jsx("path", {
						d: `M88 ${T + 7}Q91 ${T + 4} 95 ${T + 5}M103 ${T + 4}Q108 ${T + 3} 112 ${T + 7}M86 ${T + 11}Q88 ${T + 9} 90 ${T + 9.5}`,
						stroke: "#fff",
						strokeWidth: .7,
						fill: "none",
						strokeLinecap: "round",
						opacity: .85
					})
				]
			}),
			zoomable && !zoomed && /* @__PURE__ */ jsx("ellipse", {
				className: "face-hit",
				"data-layer": "ui.face-zoom",
				cx: HEAD.cx,
				cy: HEAD.cy,
				rx: HEAD.rx + 4,
				ry: HEAD.ry + 4,
				fill: "transparent",
				role: "button",
				"aria-label": "Zoom into the face",
				onClick: (e) => {
					e.stopPropagation();
					setZoomed(true);
				}
			})
		]
	});
}
//#endregion
//#region app/components/TunePanel.tsx
/**
* Debug doll tuner (desktop only — toggled with the ` key, see DebugTuner in root.tsx).
* Live sliders for every doll measurement + a preview doll whose body type and hair can be
* switched here. "Copy values" gives the changed numbers to paste back so they can be baked in.
*/
var BODY_OPTS = [
	"long",
	"hourglass",
	"pear"
];
var BACK_OPTS = [
	"short",
	"bob",
	"medium",
	"long"
];
var TEX_OPTS = ["straight", "curly"];
var BANG_OPTS = [
	"side",
	"open",
	"blunt"
];
var BANGLEN_OPTS = [
	"short",
	"medium",
	"long"
];
function Pick({ label, value, options, onChange }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "tune-pick",
		children: [/* @__PURE__ */ jsx("span", { children: label }), /* @__PURE__ */ jsx("div", {
			className: "chip-row wrap",
			children: options.map((o) => /* @__PURE__ */ jsx("button", {
				type: "button",
				className: `chip ${value === o ? "selected" : ""}`,
				onClick: () => onChange(o),
				children: o
			}, o))
		})]
	});
}
function TunePanel({ onClose }) {
	useTuneVersion();
	const s = useGame();
	const signedIn = !!getSession();
	const [look, setLook] = useState({ ...s.avatar });
	const [applyToMe, setApplyToMe] = useState(signedIn);
	const [outfit, setOutfit] = useState(false);
	const [copied, setCopied] = useState(null);
	const params = allParams();
	const groups = [...new Set(params.map((p) => p.group))].filter((g) => !g.includes(" · ") || g.endsWith(` · ${look.body}`));
	const changed = params.filter((p) => p.obj[p.key] !== p.def).length;
	const update = (patch) => {
		setLook((l) => ({
			...l,
			...patch
		}));
		if (applyToMe && signedIn) actions.setAvatar(patch);
	};
	async function copy() {
		const text = exportChanged();
		try {
			await navigator.clipboard.writeText(text);
			setCopied("Copied ✓ — paste it to Claude when you're happy");
		} catch {
			setCopied(text);
		}
	}
	return /* @__PURE__ */ jsxs("aside", {
		className: "tune-overlay",
		role: "dialog",
		"aria-label": "Doll tuner (debug)",
		children: [
			/* @__PURE__ */ jsxs("header", {
				className: "tune-head",
				children: [
					/* @__PURE__ */ jsx("b", { children: "doll tuner" }),
					/* @__PURE__ */ jsx("span", {
						className: "hint",
						children: "` to toggle"
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						className: "tune-close",
						onClick: onClose,
						"aria-label": "Close tuner",
						children: "✕"
					})
				]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "tune-preview",
				children: /* @__PURE__ */ jsx(Avatar, {
					look,
					items: outfit && signedIn ? wornItems(s) : [],
					size: 300,
					zoomable: true
				})
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "tune-looks",
				children: [
					/* @__PURE__ */ jsx(Pick, {
						label: "body",
						value: look.body,
						options: BODY_OPTS,
						onChange: (body) => update({ body })
					}),
					/* @__PURE__ */ jsx(Pick, {
						label: "hair",
						value: look.backHair,
						options: BACK_OPTS,
						onChange: (backHair) => update({ backHair })
					}),
					/* @__PURE__ */ jsx(Pick, {
						label: "texture",
						value: look.hairTexture ?? "straight",
						options: TEX_OPTS,
						onChange: (hairTexture) => update({ hairTexture })
					}),
					/* @__PURE__ */ jsx(Pick, {
						label: "bangs",
						value: look.bangs,
						options: BANG_OPTS,
						onChange: (bangs) => update({ bangs })
					}),
					/* @__PURE__ */ jsx(Pick, {
						label: "bang length",
						value: look.bangLength,
						options: BANGLEN_OPTS,
						onChange: (bangLength) => update({ bangLength })
					}),
					/* @__PURE__ */ jsxs("label", {
						className: "tune-check",
						children: [/* @__PURE__ */ jsx("input", {
							type: "checkbox",
							checked: applyToMe,
							disabled: !signedIn,
							onChange: (e) => setApplyToMe(e.target.checked)
						}), " also change my avatar"]
					}),
					/* @__PURE__ */ jsxs("label", {
						className: "tune-check",
						children: [/* @__PURE__ */ jsx("input", {
							type: "checkbox",
							checked: outfit,
							disabled: !signedIn,
							onChange: (e) => setOutfit(e.target.checked)
						}), " wear my outfit"]
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "tune-actions",
				children: [/* @__PURE__ */ jsxs("button", {
					className: "btn",
					onClick: copy,
					disabled: !changed,
					children: [
						"Copy values (",
						changed,
						")"
					]
				}), /* @__PURE__ */ jsx("button", {
					className: "btn ghost",
					onClick: () => confirm("Reset every slider to the current defaults?") && resetAll(),
					disabled: !changed,
					children: "Reset all"
				})]
			}),
			copied && (copied.startsWith("Copied") ? /* @__PURE__ */ jsx("p", {
				className: "hint",
				children: copied
			}) : /* @__PURE__ */ jsx("textarea", {
				className: "tune-export",
				readOnly: true,
				value: copied,
				onFocus: (e) => e.currentTarget.select()
			})),
			groups.map((g) => /* @__PURE__ */ jsxs("details", {
				className: "tune-group",
				open: g === "Face",
				children: [/* @__PURE__ */ jsx("summary", { children: g }), params.filter((p) => p.group === g).map((p) => /* @__PURE__ */ jsx(Slider, { p }, p.id))]
			}, g))
		]
	});
}
function Slider({ p }) {
	const v = p.obj[p.key];
	const dirty = v !== p.def;
	return /* @__PURE__ */ jsxs("label", {
		className: `tune-row ${dirty ? "dirty" : ""}`,
		children: [
			/* @__PURE__ */ jsx("span", {
				className: "tune-label",
				children: p.label
			}),
			/* @__PURE__ */ jsx("input", {
				type: "range",
				min: p.min,
				max: p.max,
				step: p.step,
				value: v,
				onChange: (e) => setParam(p, +e.target.value)
			}),
			/* @__PURE__ */ jsx("span", {
				className: "tune-value",
				children: +v.toFixed(2)
			}),
			/* @__PURE__ */ jsx("button", {
				type: "button",
				className: "tune-reset",
				onClick: () => setParam(p, p.def),
				disabled: !dirty,
				"aria-label": `Reset ${p.label}`,
				children: "↺"
			})
		]
	});
}
//#endregion
export { TunePanel as default };
