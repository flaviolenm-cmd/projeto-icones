
function slugify(value){
 return value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
}

function createFont(config){
 return {
  id: slugify(config.label),
  fallback: "sans-serif",
  files: [],
  isLocal: false,
  ...config
 };
}

const fixedFontCatalog = new Map([
 ["Tiberias", createFont({ label:"Tiberias", cssFamily:"UC-Tiberias", files:["Tiberias.otf"], fallback:"serif", isLocal:true })],
 ["daydream FREE", createFont({ label:"daydream FREE", cssFamily:"UC-daydream-FREE", files:["daydream FREE.ttf"], fallback:"cursive", isLocal:true })],
 ["Thank you", createFont({ label:"Thank you", cssFamily:"UC-Thank-you", files:["Thank you.ttf"], fallback:"cursive", isLocal:true })],
 ["hello honey", createFont({ label:"hello honey", cssFamily:"UC-hello-honey", files:["hello honey.otf"], fallback:"cursive", isLocal:true })],
 ["Magneton Regular", createFont({ label:"Magneton Regular", cssFamily:"UC-Magneton-Regular", files:["Magneton Regular.ttf"], fallback:"sans-serif", isLocal:true })],
 ["Autography", createFont({ label:"Autography", cssFamily:"UC-Autography", files:["Autography.otf"], fallback:"cursive", isLocal:true })],
 ["chalala", createFont({ label:"chalala", cssFamily:"UC-chalala", files:["chalala.ttf"], fallback:"cursive", isLocal:true })],
 ["Audiowide-Regular", createFont({ label:"Audiowide-Regular", cssFamily:"UC-Audiowide-Regular", files:["Audiowide-Regular.ttf"], fallback:"sans-serif", isLocal:true })],
 ["Bellota-Regular", createFont({ label:"Bellota-Regular", cssFamily:"UC-Bellota-Regular", files:["Bellota-Regular.ttf"], fallback:"sans-serif", isLocal:true })],
 ["BerkshireSwash-Regular", createFont({ label:"BerkshireSwash-Regular", cssFamily:"UC-BerkshireSwash-Regular", files:["BerkshireSwash-Regular.ttf"], fallback:"cursive", isLocal:true })],
 ["Impact", createFont({ label:"Impact", cssFamily:"UC-Impact", files:["impact.ttf"], fallback:"sans-serif", isLocal:true })],
 ["cattle-trail-jnl", createFont({ label:"cattle-trail-jnl", cssFamily:"UC-cattle-trail-jnl", files:["cattle-trail-jnl.otf"], fallback:"serif", isLocal:true })],
 ["nabi-modern-font", createFont({ label:"nabi-modern-font", cssFamily:"UC-nabi-modern-font", files:["nabi-modern-font.ttf"], fallback:"sans-serif", isLocal:true })],
 ["Nickainley-Normal", createFont({ label:"Nickainley-Normal", cssFamily:"UC-Nickainley-Normal", files:["Nickainley-Normal.otf"], fallback:"cursive", isLocal:true })]
]);

const fixedFontOrder = [
 "Tiberias",
 "daydream FREE",
 "Thank you",
 "hello honey",
 "Magneton Regular",
 "Autography",
 "chalala",
 "Audiowide-Regular",
 "Bellota-Regular",
 "BerkshireSwash-Regular",
 "Impact",
 "cattle-trail-jnl",
 "nabi-modern-font",
 "Nickainley-Normal"
];

const fixedFonts = fixedFontOrder
 .map(label => fixedFontCatalog.get(label))
 .filter(Boolean);

const suggestFonts = [
 createFont({ label:"Great Vibes", cssFamily:"Great Vibes", fallback:"cursive" }),
 createFont({ label:"Pacifico", cssFamily:"Pacifico", fallback:"cursive" }),
 createFont({ label:"Dancing Script", cssFamily:"Dancing Script", fallback:"cursive" }),
 createFont({ label:"Playfair Display", cssFamily:"Playfair Display", fallback:"serif" }),
 createFont({ label:"Cinzel", cssFamily:"Cinzel", fallback:"serif" }),
 createFont({ label:"Lobster", cssFamily:"Lobster", fallback:"cursive" }),
 createFont({ label:"Montserrat", cssFamily:"Montserrat", fallback:"sans-serif" }),
 createFont({ label:"Poppins", cssFamily:"Poppins", fallback:"sans-serif" })
];

const allFonts = [...fixedFonts, ...suggestFonts];
const fontMap = new Map(allFonts.map(font=>[font.id,font]));
const openTypeFontCache = new Map();
const EXPORT_WIDTH = 1280;
const EXPORT_HEIGHT = 720;
const PREVIEW_PATH_WIDTH_RATIO = 0.88;
const PREVIEW_PATH_HEIGHT_RATIO = 0.66;
const EXPORT_PATH_WIDTH_RATIO = 0.36;
const EXPORT_PATH_HEIGHT_RATIO = 0.20;
const WATERMARK_TEXT = "Ultracell";
const MODEL_STL_PATH = "model.stl";
let textMeasureCanvas = null;
let bottleGeometryPromise = null;
const bottleModelCache = new Map();

function clampByte(value){
 return Math.max(0, Math.min(255, Math.round(value)));
}

function hexToRgb(hex){
 const normalized = String(hex).replace("#", "");
 const value = normalized.length === 3
  ? normalized.split("").map(part=>part + part).join("")
  : normalized;

 return {
  r: parseInt(value.slice(0, 2), 16),
  g: parseInt(value.slice(2, 4), 16),
  b: parseInt(value.slice(4, 6), 16)
 };
}

function rgbToHex(rgb){
 return `#${[rgb.r, rgb.g, rgb.b]
  .map(channel=>clampByte(channel).toString(16).padStart(2, "0"))
  .join("")}`;
}

function mixHex(baseHex, targetHex, ratio = 0.5){
 const base = hexToRgb(baseHex);
 const target = hexToRgb(targetHex);

 return rgbToHex({
  r:(base.r * (1 - ratio)) + (target.r * ratio),
  g:(base.g * (1 - ratio)) + (target.g * ratio),
  b:(base.b * (1 - ratio)) + (target.b * ratio)
 });
}

function createBottleTheme(config){
 const light = Boolean(config.light);
 const base = config.base;
 const rgb = hexToRgb(base);
 const brightness = ((rgb.r * 0.299) + (rgb.g * 0.587) + (rgb.b * 0.114)) / 255;

 return {
  key:config.key,
  label:config.label,
  light,
  body:config.body || base,
  rightCap:config.rightCap || mixHex(base, "#000000", light ? 0.22 : 0.16),
  centerRing:config.centerRing || mixHex(base, "#000000", light ? 0.30 : 0.22),
  neck:config.neck || mixHex(base, "#000000", light ? 0.18 : 0.10),
  front:config.front || mixHex(base, "#000000", light ? 0.10 : 0.05),
  inner:config.inner || "#ffffff",
  highlight:config.highlight || (light ? "#111111" : "#ffffff"),
  highlightOpacity:config.highlightOpacity || (light ? "0.05" : "0.09"),
  previewFill:config.previewFill || (brightness >= 0.68 ? "metallic-steel-dark" : "metallic-silver"),
  dot:config.dot || base,
  dotBorder:config.dotBorder || (light ? mixHex(base, "#000000", 0.45) : "#111111")
 };
}

const bottleThemes = {
 preto:createBottleTheme({
  key:"preto",
  label:"Preto",
  base:"#050505",
  body:"#030303",
  rightCap:"#9b9b9b",
  centerRing:"#8c8c8c",
  neck:"#030303",
  front:"#050505",
  inner:"#ffffff",
  dot:"#050505",
  dotBorder:"#111111"
 }),
 branco:createBottleTheme({
  key:"branco",
  label:"Branco",
  base:"#ffffff",
  body:"#ffffff",
  rightCap:"#b0b0b0",
  centerRing:"#9a9a9a",
  neck:"#ffffff",
  front:"#ffffff",
  inner:"#ffffff",
  dot:"#ffffff",
  dotBorder:"#7a7a7a",
  light:true
 }),
 areia:createBottleTheme({
  key:"areia",
  label:"Areia",
  base:"#d8c2a1",
  light:true
 }),
 caqui:createBottleTheme({
  key:"caqui",
  label:"Cáqui",
  base:"#9b8c67"
 }),
 creme:createBottleTheme({
  key:"creme",
  label:"Creme",
  base:"#f1e7d4",
  light:true
 }),
 tiffany:createBottleTheme({
  key:"tiffany",
  label:"Tiffany",
  base:"#63d7ce"
 }),
 petroleo:createBottleTheme({
  key:"petroleo",
  label:"Petróleo",
  base:"#264c58"
 }),
 ceu:createBottleTheme({
  key:"ceu",
  label:"Céu",
  base:"#4ea3f2"
 }),
 nuvem:createBottleTheme({
  key:"nuvem",
  label:"Nuvem",
  base:"#dcecff",
  light:true
 }),
 pistache:createBottleTheme({
  key:"pistache",
  label:"Pistache",
  base:"#bfd89c",
  light:true
 }),
 mirtilo:createBottleTheme({
  key:"mirtilo",
  label:"Mirtilo",
  base:"#49548f"
 }),
 pitaya:createBottleTheme({
  key:"pitaya",
  label:"Pitaya",
  base:"#df4b83"
 }),
 chocolate:createBottleTheme({
  key:"chocolate",
  label:"Chocolate",
  base:"#4b2f22"
 }),
 lavanda:createBottleTheme({
  key:"lavanda",
  label:"Lavanda",
  base:"#b59add",
  light:true
 }),
 celeste:createBottleTheme({
  key:"celeste",
  label:"Celeste",
  base:"#73d8ff",
  light:true
 }),
 amarelo:createBottleTheme({
  key:"amarelo",
  label:"Amarelo",
  base:"#f4d13f",
  light:true
 }),
 "verde-citrus":createBottleTheme({
  key:"verde-citrus",
  label:"Verde Citrus",
  base:"#80d62f"
 }),
 vermelho:createBottleTheme({
  key:"vermelho",
  label:"Vermelho",
  base:"#c8272f"
 }),
 laranja:createBottleTheme({
  key:"laranja",
  label:"Laranja",
  base:"#ef7b22"
 })
};

const bottleColorGroups = [
 {
  title:"Cores Clássicas e Neutras",
  colors:["preto", "branco", "areia", "caqui", "creme"]
 },
 {
  title:"Tons de Azul e Verde",
  colors:["tiffany", "petroleo", "ceu", "nuvem", "pistache", "mirtilo"]
 },
 {
  title:"Tons Vibrantes e Quentes",
  colors:["pitaya", "chocolate", "lavanda", "celeste", "amarelo", "verde-citrus", "vermelho", "laranja"]
 }
];

const INLINE_ICON_VIEWBOX = "0 0 6095.98 6095.98";

const iconSvgMarkup = {
 'coracoes-1':"\u003cpath d=\"M2497.05 2140.88c121.06,32.35 62.31,46.82 162.68,311.37 49.42,130.3 77.83,245.07 -31.48,318.26 0,-325.38 -131.2,-339.05 -131.2,-629.63zm498.47 1888.89c-132.15,-69.94 -11.99,9.91 -175.6,-191.68 -301.02,-370.9 -847.55,-1248.76 -847.55,-1749.67 0,-231.74 241.69,-406.97 494.94,265.86l143.99 459.42c30.55,123.67 -9.55,82.61 69.4,140.46l52.46 -131.16c13.95,59.8 56.06,215.1 78.71,262.32 106.74,-2.35 78.3,0.62 130.23,-53.42 74.55,-77.55 74.3,-162.73 114.4,-252.87 135.53,-304.81 614.94,-1398.95 988.41,-1398.95 233.79,0 11.41,647.33 -22.93,737.9 -46.04,121.49 -46.16,41.55 -135.09,310.88l-217.86 464.23c-140.25,261.21 -326.04,531.22 -489.73,848.26 -39.94,77.37 -123.08,243.95 -183.78,288.42zm-26.25 -1495.37l-104.91 0c-5.05,-225.7 -231.31,-660.71 -488.8,-796.83 -307.01,-162.28 -691.76,84.15 -691.76,482.01 0,580.55 481.43,1262.45 781.52,1710.76 362.72,541.84 341.59,437.02 207.42,747.34 -29.59,68.45 -54.26,147.03 -70.74,217.83 396.53,-33 397.42,-675.77 682.09,-682.09 0,-227.09 63.12,-186.1 112.76,-333.25 57.2,-169.68 -39.51,-41.89 128.28,-317.7 120.1,-197.44 225.67,-368.17 347.5,-570.72 262.7,-436.81 539.56,-868.44 539.56,-1428.01 0,-460.98 -512.63,-554.62 -1012.09,142.22 -121.25,169.18 -425.5,589.38 -430.83,828.44z\"/\u003e\u003cpath d=\"M2995.53 3126.7c90.66,-24.2 95.62,-45.58 104.92,-157.41 -92.09,48.74 -101.79,16.83 -104.92,157.41z\"/\u003e",
 'coracoes-10':"\u003cpath d=\"M1884.1 1947.45c135.87,3.02 221.55,52.71 311.01,114.47 52.77,36.42 79.37,55.76 130.28,95.02 153.14,118.19 34.44,119.55 164.96,260.54 125.23,135.31 92.21,82.04 171.2,279.34 35.51,88.69 13.43,92.47 123.64,101.64 -53.63,80.05 -41.13,17.53 -50.08,125.17 98.06,47.03 113.22,6.92 125.17,150.18 99.71,-8.31 128.63,-56.11 182.7,-117.66 141.9,-161.48 74.29,-756.76 489.03,-1087.84 279.22,-222.93 313.25,-221.22 579.76,-221.22 462.34,0 425.5,431.42 425.5,725.87 0,361.29 -315.85,729.67 -556.91,969.93l-580.11 571.25c-43.61,56.02 -144.21,180.54 -189.56,210.93 -103.27,-69.17 -134.84,-171.7 -246.11,-254.51 -94.16,-70.03 -223.89,-130.93 -337.94,-187.69 -128.04,-63.71 -224.41,-118.23 -340.8,-184.8 -129.88,-74.29 -193.41,-116.54 -309.88,-215.78 -339.09,-288.92 -471.42,-818.96 -350.24,-1117.96 91.11,-224.68 202.69,22.14 258.38,-216.88zm400.46 25.04c131.92,69.77 213.45,98.63 320.17,205.47 87.42,87.47 202.72,220.8 205.47,345.18 -63.15,-46.27 -26.76,-28.68 -61.91,-63.24 -45.26,-44.55 -25.87,-22.2 -67.08,-58.06 -120.76,-105.13 -29.89,-91.17 -279.37,-271.3 -128.83,-93.07 -59.04,-27.76 -117.28,-158.05zm675.82 425.51c-225.54,-60.22 -235.77,-600.73 -1051.27,-600.73 -302.63,0 -650.77,345.42 -650.77,650.78l0 47.12c0.27,219.65 5.76,211.38 116.54,462.07 68.26,154.41 74.35,175.58 172.41,303.17l70.69 79.5c232.78,229.02 -21.29,63.59 311.62,264.08 53.78,32.4 107.82,67.82 155.41,94.87l316.24 159.35c56.52,31.04 460.98,104.32 527.82,448.35 35.39,181.96 43.1,245.88 181.49,319.11 68.23,-64.72 54.93,-65.84 101.7,-148.62 109.94,-194.58 92.05,-141.04 205.84,-294.77 456.52,-616.66 1419.54,-1140.4 1419.54,-2009.56 0,-212.11 -95.58,-382.75 -205.91,-494.94 -78.76,-80.12 -86.18,-106.04 -200.14,-150.24 -364.43,-141.37 -806.52,-6.8 -1064.99,250.46 -170.04,169.22 -348.87,373.85 -406.22,620z\"/\u003e",
 'coracoes-11':"\u003cpath d=\"M2818.36 4127.31c27.34,-35.68 -5.12,-24.45 170.57,18.3l378.06 208.98c2.92,4.2 7,11.65 9.49,15.55l-3.31 61.7c-8.37,0.03 -16.06,-19.57 -18.21,-15.14l-257.26 -143.23c-4.14,-3.16 -9.49,-8.25 -13.54,-11.5 -4.02,-3.22 -9.14,-8.6 -13.16,-11.85l-252.64 -122.81zm-79.26 -1405.84c24.15,-15.85 198.87,356.2 204.4,604.89l125.14 0c25.3,-108.53 35.92,-560.22 125.17,-700.86 0,212.59 -25.04,365.08 -25.04,600.73 80.91,-59.28 45.26,-37.13 93.98,-281.47 24.15,-121.12 34.14,-219.86 62.08,-338.38l141.87 -458.88c35.27,-115.39 4.38,-86.95 102.56,-97.68 3.99,-48.04 14.22,-100.07 33.14,-142.05 2.36,-5.26 6,-11.41 8.57,-16.47 458.91,-897.41 865.43,667.84 323.48,1574.98 -77.34,129.43 -138.68,231.77 -206.73,368.98 -69.92,140.98 -128.01,271.92 -208.54,392.18l-1018.51 -533.35c-310.21,-172.82 -633.48,-541.77 -633.48,-943.41 0,-832.86 626.12,-405.67 783.28,-32.38l76 174.31c29.39,48.95 14.7,27.11 41.81,58.3l-29.18 -229.44zm805.12 -846.84l7.48 7.45c-0.5,-0.5 -9.96,-4.97 -7.48,-7.45zm-525.63 700.82c-177.32,-14.75 -12.86,-45.49 -305.89,-319.87 -248.66,-232.84 -1145.87,-402.77 -1145.87,520.11 0,273.63 113.67,476.14 250.78,700.38 48.58,79.43 504.38,441.96 507.51,443.62l304.59 170.99c42.31,20.7 112.76,52.62 150.27,74.97l456.31 269.59c82.63,44.37 80.94,25.01 133.06,92.21 95.79,123.51 4.08,125.49 249.96,125.49 5.23,-234.37 101.08,50.53 116.89,-176.61 9.17,-131.55 -61.64,26.14 8.25,-273.93l75.09 125.14c22.26,-95.49 52.86,-104.74 75.09,-200.23 -91.38,19.37 -72.49,41.69 -75.09,-75.09 124.87,-13.66 52.27,-20.93 113.82,-108.82 67.96,-97.06 193.49,0.71 211.58,-216.55l-75.09 0c45.17,-61.67 50.85,-30.13 95.34,-104.92 284.49,-478.39 513.66,-1352.9 243.19,-1885.6 -279.02,-549.54 -1110.95,-357.77 -1389.79,839.12z\"/\u003e",
 'coracoes-2':"\u003cpath d=\"M3085.54 2775.23l-50.08 0c-3.19,-144.12 -68.17,-334.07 -93.89,-456.78 -93.27,-445.25 -256.7,-944.9 -782.15,-944.9 -324.04,0 -700.85,256.52 -700.85,575.68 0,384.18 56.11,487.5 225.27,826 53.8,107.61 98.44,185.54 158.22,292.32l688.44 1342.72c59.24,60.14 71.69,30.63 129.51,-8.1 -19.33,91.38 -41.65,72.49 75.09,75.09l0 75.09c101.73,0 80.59,-8.36 150.18,25.02 -16.02,68.82 -34.02,131.43 -50.05,200.26 340.24,0 556.38,-234.14 708.84,-492.61 435.7,-738.7 1093.33,-1502.85 1093.33,-2536.05 0,-903.65 -847.28,-149.38 -1062.35,139.13 -146.37,196.36 -436.41,659.2 -489.51,887.13z\"/\u003e",
 'coracoes-3':"\u003cpath d=\"M2993.93 2294.9c-145.27,-97.27 -371.58,-458.29 -823.63,-298.03 -128.51,45.53 -275.41,140.28 -357.24,243.54 -449.27,566.76 97.53,1154.23 522.59,1513.72l1008.69 768.44c82.52,-19.22 195.71,-70.84 255.78,-119.65 102.59,-83.34 78.11,-142.88 148.68,-251.84 193.49,-298.83 163.69,-213.21 366.31,-584.79 268.64,-492.58 565.58,-1405.26 65.63,-1857.48 -14.3,-12.92 -42.92,-36.25 -55.34,-44.76 -280.94,-192.13 -629.16,-43.31 -842.72,118.63 -70.96,53.81 -139.96,141.7 -184.3,216.2 -59.45,99.81 -59.9,203.19 -104.45,296.02z\"/\u003e",
 'coracoes-4':"\u003cpath d=\"M2198.85 1357.76c164.28,110.01 155.3,108.65 236.63,314.05 151.51,382.67 71.98,932.21 -25.78,1323.48 -15.44,61.76 -16.77,73.7 -33,117.19 -51.97,139.51 -52.68,-20.84 -52.68,272.69 303.56,0 49.14,-34.09 196.39,-31.4 125.91,2.34 99.6,206.06 345.68,-352.62 139.27,-316.27 391.98,-570.57 700.85,-727.49l358.99 -89.93c64.86,0 25.72,16.76 125.17,25.04l28.82 149.35 71.28 0.83c0,161.23 -1.36,203.86 -40.38,335.03 -29.24,98.27 -52.15,211.91 -159.85,240.65 76.09,-158.58 125.14,-313.46 125.14,-550.64l-18.36 31.66c-2.22,4.91 -12.98,27.31 -15.64,34.44l-74.61 275.79c-68.38,207.89 -110.66,200.74 -180.49,295.1 -89.72,121.3 -54.33,116.36 -196.5,254.04 -32.61,31.54 -21.47,12.06 -46.24,53.86 -26.61,44.85 -13.07,38.88 -36.78,88.37 -31.75,66.28 -62.61,91.91 -112.87,137.44 -53.63,48.57 -73.23,53.39 -125.46,99.8l-895.09 731.89c-39.41,-58.89 -54.78,-87.09 -82.04,-168.24 -115.76,-344.44 -92.5,-64.27 -191.74,-333.91 -29.77,-80.92 -51.59,-110.95 -51.59,-223.71 -57.09,13.28 -57.59,19.39 -125.17,25.01 -94.54,-405.78 -186.93,-574.97 -265.56,-1111.07l16.02 -690.33c23.09,-62.88 7.06,-23.71 24.27,-50.82l0 225.27c102.11,-33.85 11.35,21.62 36.54,-70.21l180.28 -438.83c67.84,-107.85 130.4,-156.07 283.77,-191.78zm-500.59 400.46c0,-64 39.64,-4.02 14.9,0 -0.33,0.06 -14.9,69.89 -14.9,0zm25.04 -100.1l7.48 7.45c-0.5,-0.47 -9.96,-4.96 -7.48,-7.45zm25.04 -50.08l7.45 7.48c-0.5,-0.5 -9.96,-4.99 -7.45,-7.48zm400.46 2978.58c-155.23,36.18 -210.81,164.51 -125.55,166.5 69.32,1.59 12.65,1.59 41.5,-18.93 90.7,-64.5 -39.26,-56.25 109.09,-72.48 -18.68,80.14 -37.75,93.39 -75.15,150.12 -45.85,69.56 -39.82,76.86 -75.03,150.24 121.71,-28.35 178.62,-96.79 300.36,-125.14 -11.26,135.19 -63.59,100.1 125.14,100.1 13.45,-153.94 17.56,-48.6 39.56,-56 42.95,-14.39 4.17,29.04 87.03,-15.99 40.44,-21.96 71.54,-95.75 130.49,-146.48l822.95 -804.03 465 -611.28c194.91,-269.61 519.63,-846.15 202.33,-1164.82 -325.76,-327.08 -793.24,78.23 -867.12,78.55l-154.37 16.83c-189.65,0 -4.65,-114.3 -197.01,178.41 -50.56,76.95 0.56,43.34 -78.32,71.87 0,-283.19 -12.03,-670.14 -113.37,-912.85 -300.66,-720.13 -1484.19,-699.53 -1205.97,1205.96 84.46,578.58 206.91,876.91 404.1,1373.03 86.38,217.38 164.34,302.82 164.34,436.39z\"/\u003e\u003cpath d=\"M3700.66 1683.13c119.52,-31.9 100.13,-59.12 100.13,-200.23 69.95,80.44 28.17,58.63 25.04,200.23 122.24,-28.47 112.22,-34.17 161.89,-138.47 80.14,-168.36 195.59,-296.34 -86.8,-362.12 -42.39,181.9 -57.71,110.89 -124.61,225.8 -30.15,51.83 -69.21,197.46 -75.65,274.79z\"/\u003e\u003cpath d=\"M4326.42 1808.3c86.38,0 90.55,11.62 154.82,-20.4 196.36,-97.88 368.51,-565.63 1.57,-198.69 -78.79,78.82 -128.54,99.63 -156.39,219.09z\"/\u003e\u003cpath d=\"M1397.9 2058.58c163.66,-43.69 18.48,-220.57 207.95,-593 41.29,-81.15 70.21,-87.57 92.41,-182.91 -98.27,65.78 -163.48,185.33 -215.13,310.47 -70.07,169.67 -85.23,236.83 -85.23,465.44z\"/\u003e",
 'coracoes-5':"\u003cpath d=\"M3123.61 2857.49c-14.87,-178.68 -213.09,-917.82 -267.75,-1058.84 -411.16,-1061.16 -1428.84,-594.48 -1356.62,153.17 39.85,412.38 158.55,702.18 367.76,1035.95l823.22 1279.29c52.06,86.79 78.07,131.08 124.75,225.68 41.51,84.26 66.23,167.71 133.45,216.97 0,-396.89 -56.55,-279.35 -258.2,-642.88l-569.18 -932.6c-143.18,-239.26 -305.54,-509.58 -402.38,-799.06 -87.98,-262.94 -141.52,-475.67 -15.26,-722.67 56.88,-111.22 9.85,-108.86 118.67,-181.7 -18.3,219.74 -281.53,279.96 128.04,1248.6l398.98 677.29c194.7,325.37 695.23,1076.63 724.47,1428.11 49.76,-23.86 89.49,-35.92 150.18,-50.05 8.28,-99.43 25.04,-60.28 25.04,-125.15 0,-166.02 -411.22,-811.36 -536.18,-1015.7 -273.05,-446.49 -915.57,-1194.88 -915.57,-1812.69 0,-117.13 60.1,-318.95 155.88,-369.77 5.15,-2.75 12.3,-4.85 17.68,-7.39 5.44,-2.58 12.54,-4.56 18.07,-7.07 5.52,-2.48 12.38,-4.79 17.88,-7.3 5.47,-2.51 12,-5.41 17.41,-7.95 509.85,-240.86 776.24,620.58 855.65,1018.98l214.01 1084.88c2.27,130.13 -32.05,63.88 4.99,222.93 82.93,-60.75 23.89,-41.12 90.38,-109.86 45.52,-47.06 60.66,-42.24 159.9,-65.36 0,-554.43 243.04,-2097.68 800.99,-2227.67 157.27,105.33 210.37,156.3 248.42,379.06 27.73,162.42 4.02,376.69 -37.87,557.35 -19.66,84.73 -45.24,179.27 -78.08,247.33 -46.74,96.88 -72.46,96.76 -107.7,217.7 -47.03,161.53 -112.34,315.59 -183.2,467.57 -127.39,273.16 -804.24,1622.81 -817.75,1785.38 219.1,-51.06 200.23,-76.19 291.7,-258.95 342.2,-683.76 1135.02,-2059.04 1135.02,-2819.76 0,-698.93 -550.73,-1024.48 -926.51,-450.89 -210.61,321.5 -330.07,667.68 -425.18,1051.59 -36.98,149.32 -54.95,324.1 -125.11,375.48zm-175.19 1877.26l7.45 -7.45c-0.47,0.47 -9.93,4.96 -7.45,7.45z\"/\u003e\u003cpath d=\"M2665.71 2048.26c75.95,113.4 72.04,40.77 151.95,173.42l18.16 31.9c139.56,206.61 246.61,422.78 319.99,681.22l196.56 854.7c9.7,54.6 10.88,98.89 20.16,155.06l35.6 114.58c1.62,3.67 5.17,11.3 8.48,16.53 0,-299.03 54.72,-180.84 -54.84,-620.97 -31.1,-124.82 -438.36,-1658.55 -696.06,-1406.44z\"/\u003e\u003cpath d=\"M2997.38 3310.8l75.09 0c0,-181.22 44.55,-352.42 17.32,-442.38 -20.43,-67.55 -28.02,-66.04 -92.41,-83.25l0 525.63z\"/\u003e",
 'coracoes-6':"\u003cpath d=\"M1770.39 2525.75c0,-265.63 -25.93,-257.77 75.09,-325.41 0,1040.69 391.5,1093.19 425.5,1501.81 -121.83,-81.56 -239.19,-371.31 -300.39,-525.57 -65.13,-164.14 -200.2,-439.9 -200.2,-650.83zm100.13 -350.42c-49.4,-71.1 -38.82,-113.16 -109.56,38.44 -225.92,484.27 208.45,1058.56 401.94,1446.31 48.36,96.91 175.43,450.07 282.65,572.08 45.73,52.03 31.43,42.48 75.74,-4.38l0 125.14c473.72,0 147.46,-470.73 83.07,-608.67 -37.69,-80.68 -51.05,-129.19 -91.11,-209.25 -38.08,-76.09 -62.08,-123.25 -100.43,-199.96 -71.95,-143.92 -134.74,-255.99 -195.41,-405.29 -155.38,-382.39 -146.66,-244.36 -146.66,-704.37 0,-251.16 119.85,-400.49 350.41,-400.49 101.82,0 185.51,232.52 237.45,288.18 49.7,53.28 5.41,5.47 57.18,42.99 82.42,59.78 42.24,-54.93 41.77,127.8 -0.21,86.83 6.44,42.78 13.84,66.49 66.54,213.5 3.48,452.96 0.2,600.9l200.23 25.04c44.32,-165.94 97.8,33.05 228.23,-372.5 34.62,-107.61 138.92,-305.65 198.13,-402.56 126.44,-206.85 161.57,-173.62 242.54,-208.03l90.67 -61.41c266.98,-197.27 594.87,266.37 -83.84,1219.63l-386.27 489.77c-145.81,186.6 -510.17,632.09 -514.73,836.9 314.11,0 188.29,-63.7 547.1,-504.17 318.42,-390.88 1104.89,-1249.78 1104.89,-1748.54 0,-295.07 -33.97,-550.64 -500.59,-550.64 -548.81,0 -720.04,512.98 -851.04,600.69 -10.58,-127.18 -102.14,-345.5 -163.95,-436.76 -273.14,-403.24 -1012.45,-232.52 -1012.45,336.66z\"/\u003e",
 'coracoes-7':"\u003cpath d=\"M1867.33 2497.32l14.84 35.24c6.68,20.51 11.59,34.91 17.14,57.91l83.43 342.1c48.22,144.54 87.72,270.57 150.86,399.79 57.95,118.6 138.39,239.72 212.8,337.87 93.06,122.72 193.81,223.2 196.74,353.93 -112.37,-30 -172.18,-166.35 -251.49,-299.18 -197.78,-331.31 -344.77,-517.59 -425.53,-977.32 -28.36,-161.42 -10.82,-105.78 1.21,-250.34zm851 1351.62c-27.94,-119.91 -232.19,-319.87 -382.78,-668.48 -183.32,-424.44 -364.16,-1019.66 -160.17,-1476.41 248,-555.34 517.94,-61.43 517.94,593.04 0,152.69 -23.32,575.65 0,675.81 72.7,-48.69 33.58,-50.64 125.14,-75.09 21.26,91.26 37.9,151.92 125.14,175.22 2.49,-111.48 93.72,-211.82 183.59,-392.13 127.03,-254.98 256.08,-492.07 474.49,-676.9 129.84,-109.92 249.6,-207.51 418.23,-207.51 196.44,0 104.65,320.82 100.13,375.45l-100.13 -150.18c0,143.15 17.14,235.65 -31.9,343.56 -162.72,358.18 -387.37,619.58 -636.17,915.69 -136.61,162.56 -439.69,551.82 -633.51,567.93zm-175.19 -2377.85c375.22,87.42 364.34,626.47 300.36,901.09 -96.94,-139.48 -99.21,-368.15 -121.95,-478.78 -27.37,-133.12 -55.4,-220.86 -125.02,-325.52l-53.39 -96.79zm-75.09 2653.2c-87.54,23.36 -55.99,24.57 -123.22,77.02 -100.45,78.4 -102.05,39.52 -102.05,198.3 205.76,-4.58 259.42,-125.17 375.45,-125.17 131.82,0 319.61,185.39 426.54,249.28l343.11 182.52c70.8,40.06 58.89,9.7 81.35,93.84l150.19 0c28.49,-106.64 73.76,-70.63 200.26,-100.1l0 -75.09 -470.8 -280.14c-163.72,-98.8 -327.14,-166.56 -430.29,-320.59 59.04,-88.18 141.85,-129.19 219.51,-205.99l412.94 -438.07c73.79,-75.92 132.26,-163.96 201.41,-249.16 176.58,-217.52 808.7,-1036.63 512.51,-1379.26 -213.04,-246.44 -670.47,4.05 -828.07,162.62 -128.21,128.99 -262.04,395.11 -393.16,482.92 0,-533.8 7.6,-1101.32 -625.76,-1101.32 -272.87,0 -482.44,276.56 -584.49,466.74 -115.27,214.84 -83.28,654.71 -45.8,914.45 51.86,359.55 121.72,528.91 254.66,796.61 131.14,264.11 392.3,507.27 425.71,650.59z\"/\u003e\u003cpath d=\"M3085.54 3098.05c-8.13,-97.85 15.13,-76.03 -75.09,-100.13 23.35,87.45 9.52,56.2 75.09,100.13z\"/\u003e",
 'coracoes-8':"\u003cpath d=\"M3244.16 3913.78c128.93,94.46 17.03,121 125.14,200.23 0,-515.78 5.95,-794.74 102.03,-1274.61l98.2 -377.37c70.34,301.84 0.54,915.18 -0.56,1227.04 -0.56,155.24 12.24,571.04 99.39,726.61 2.69,4.81 6.45,11.14 9.26,15.75l17.09 -617.78c0,-432.71 18.89,-1138.3 -47.93,-1532.17l14.37 -176.69c68.97,-211.94 -7.06,-126.98 83.61,-193.41 0,673.33 -30.4,2037.23 25.04,2703.23 -96.65,-25.81 -61.67,-56.2 -274.38,-176.17l-566.1 -385.06c-103.65,-75.45 -174.84,-130.91 -285.88,-189.68 146.46,-305.21 50.05,-779.43 50.05,-1101.31 103.86,69.56 261.43,448.62 315.85,585.26 52.57,131.97 67.53,503.1 134.69,791.4 147.85,-3.31 169.19,-55.66 124.73,-171.55 -2.07,-5.41 -5.94,-12.86 -7.98,-17.74 -2.63,-6.27 -12.74,-28.62 -16.62,-35.98zm961.31 -2853.43l38.7 0c82.3,5.11 165.76,43.69 246.76,129.87 60.87,64.71 83.37,136.97 119.52,230.92 368.86,959.29 -203.92,2375.69 -505.73,3228.02 -63.45,179.16 -137.21,430.33 -362.71,379.92 -168.48,-37.69 189.82,-146.63 -239.52,-397.48 -484.93,-283.33 -771.63,-493.76 -1205.94,-821.47 -379.86,-286.58 -288.48,-319.57 -404.01,-396.97 3.72,167.59 161.8,257.52 368.68,457.31 205.91,198.9 492.49,333.62 726.01,500.48 228.2,163.01 77.43,111.07 464.73,336.22 228.58,132.88 192.67,31.33 192.67,207.8l-1337.56 -915.16c-1561.4,-1177.44 -907.14,-2007.45 0.59,-1827.77 572.64,113.35 746.06,555.91 861.41,640.4 58.12,-121.15 113.17,-390.21 155.15,-545.68 74.82,-277.18 165.11,-494.18 315.26,-736 123.58,-199.08 338.11,-456.25 565.99,-470.41zm-2663.34 1752.09l139.21 261.28c33.88,55.96 41.77,70.89 76.92,123.3 42.25,62.94 57.03,68.83 59.19,166.09l-75.09 0c-42.57,-182.7 -193.73,-314.26 -200.23,-550.67zm851 -150.18l25.04 1001.21c-332.79,-222.85 -250.31,-561.55 -250.31,-1126.35 0,-81.36 21.7,-18.89 50.08,-125.14 116.63,2.6 132.06,29.41 200.23,75.09 -6.53,78.28 -25.04,88.89 -25.04,175.19zm-550.64 325.4c-162.81,-109 -269.62,-523.12 -59.54,-635.19 82.42,-43.99 167.8,-40.62 284.81,-40.62 -105.42,452.43 -50.08,438.06 -50.08,901.08 -116.42,-133.95 -25.01,-710.05 -25.01,-876.04 -155.59,104.18 -150.18,392.89 -150.18,650.77zm2327.77 250.31c0,327.94 -96.7,763.14 -190.65,1085.85l-50.44 124.79c-1.8,3.43 -5.71,10.82 -9.19,15.81 0,-145.77 26.13,-207.47 25.36,-375.12 -0.71,-158.58 -7.89,-256.37 -21.73,-379.41l-20.51 -577.58c-4.56,-81.95 16.88,-83.37 16.88,-194.7 0,-265.33 36.39,-817.19 -67.14,-1034.21 -37.72,-79.08 -142.17,-61.9 92.71,-442.03 301.04,-487.23 553.51,24.39 486.1,196.57 -44.96,114.85 0.51,-89.99 -33.11,59.89 -19.86,88.6 11.27,160.89 18.69,222.5l-46.71 947.2c-3.31,-5.2 -7.36,-20.02 -8.52,-16.5 -40.82,126.09 -41.68,-785.34 -41.53,-859.58 0.38,-166.44 3.93,-361.61 -33.56,-490.42 -1.71,-5.91 -4.16,-12.62 -5.94,-18.74 -50.23,-173.68 -16.79,-128.72 -135.72,-191.63 0,669.99 25.01,1256.34 25.01,1927.31z\"/\u003e",
 'coracoes-9':"\u003cpath d=\"M3296.61 3574.36c-1.74,-10.05 50.38,-127.68 51.77,-131.79 195,-570.51 345,-1153.73 213.59,-1760.52 -33.32,-153.78 -101.75,-178.26 -111.01,-289.48l50.05 0c55.14,236.65 175.22,194.73 175.22,800.95 0,425.18 -163.16,1047.78 -350.44,1401.71l-29.18 -20.87zm-1322.41 -179.39c108.14,2.42 180.95,61.76 266.95,108.5 156.18,84.93 371.85,182.96 544.52,231.42 106.22,29.8 219.78,77.69 314.85,85.61 -73.79,153.79 -300.33,867.38 -300.33,1076.28l194.7 -531.16c38.61,-159.44 100.28,-392.75 205.76,-470.03 -24.51,294.51 -250.31,599.87 -250.31,1026.23 107.14,-24.99 151.3,-27.5 190.39,-135.05 29.26,-80.65 48.45,-168.57 70.21,-255.16 48.57,-193.22 97.97,-355.91 139.89,-535.92 478.75,0 476.18,82.04 620.21,48.16l531.19 152.07c-28.74,-120.02 -17.06,-38.87 0,-75.09 270.88,129.99 607.31,300.28 720.86,605.75l55.05 145.16c325.52,-27.08 -71.9,-836.79 -1102.94,-1049.64l-674.19 -126.77c141.76,-295.39 375.45,-1069.15 375.45,-1401.68l0 -350.41c0,-957.72 -919.82,-1116.54 -1153.73,72.73 -22.61,114.97 -72.72,330.1 -72.72,452.91 -92.18,-24.63 -174.25,-147.11 -267.84,-257.8 -767.9,-908 -1568.41,-530.92 -1650.3,-133.5 -43.58,211.52 -43.37,475.55 109.38,648.17 23.38,26.43 36.92,38.14 61.05,64.09l79.73 70.48c266.57,143.74 30.39,-7.33 330.37,220.28 151.89,115.26 520.75,331.1 697.36,403.95 129.43,53.36 263.29,131.23 389.94,160.73 -47.81,-65.25 -123.25,-87.21 -200.23,-125.17l-166.68 -83.63c-50.17,-30.07 -25.36,-12.63 -58.59,-41.51zm-976.18 -1226.46c0,-232.98 62.23,-133.5 100.1,-275.35 321.47,0 378.44,11.86 565.46,160.44 74.88,59.51 130.28,110.12 204.72,170.73 501.24,408.03 632.44,850.88 756.11,917.02l24.12 12.15c42.54,22.79 34.09,46.06 76.57,41.24 62.23,-32.94 225.24,-94.04 225.24,-175.22l-4.49 -378.26c26.93,-318.43 2.39,-1135.7 379.94,-1223.65 357.69,262.05 157.28,1199.55 80.21,1506.92 -32.91,131.23 -57.86,224.47 -96.2,354.32 -18.63,63.08 -85.56,316.38 -134.19,316.38 -404.98,0 -1335.31,-473.25 -1716.91,-761.07 -179.74,-135.61 -460.68,-400.47 -460.68,-665.65z\"/\u003e"
};

function createIcon(config){
 const merged = {
  kind:"svg",
  width:320,
  height:320,
  ...config
 };

 return {
  ...merged,
  viewBox:merged.viewBox || INLINE_ICON_VIEWBOX,
  markup:merged.markup || iconSvgMarkup[merged.key] || ""
 };
}

const iconCatalog = [
 createIcon({
  key:"coracoes-1",
  label:"Coração 1",
  width:322,
  height:436,
  src:"svg/corações/coracoes-1.svg"
 }),
 createIcon({
  key:"coracoes-2",
  label:"Coração 2",
  width:375,
  height:408,
  src:"svg/corações/coracoes-2.svg"
 }),
 createIcon({
  key:"coracoes-3",
  label:"Coração 3",
  width:331,
  height:348,
  src:"svg/corações/coracoes-3.svg"
 }),
 createIcon({
  key:"coracoes-4",
  label:"Coração 4",
  width:389,
  height:452,
  src:"svg/corações/coracoes-4.svg"
 }),
 createIcon({
  key:"coracoes-5",
  label:"Coração 5",
  width:366,
  height:451,
  src:"svg/corações/coracoes-5.svg"
 }),
 createIcon({
  key:"coracoes-6",
  label:"Coração 6",
  width:319,
  height:337,
  src:"svg/corações/coracoes-6.svg"
 }),
 createIcon({
  key:"coracoes-7",
  label:"Coração 7",
  width:305,
  height:413,
  src:"svg/corações/coracoes-7.svg"
 }),
 createIcon({
  key:"coracoes-8",
  label:"Coração 8",
  width:397,
  height:469,
  src:"svg/corações/coracoes-8.svg"
 }),
 createIcon({
  key:"coracoes-9",
  label:"Coração 9",
  width:553,
  height:442,
  src:"svg/corações/coracoes-9.svg"
 }),
 createIcon({
  key:"coracoes-10",
  label:"Coração 10",
  width:422,
  height:372,
  src:"svg/corações/coracoes-10.svg"
 }),
 createIcon({
  key:"coracoes-11",
  label:"Coração 11",
  width:349,
  height:379,
  src:"svg/corações/coracoes-11.svg"
 })
];

const iconGroups = [
 {
  title:"SVGs Disponíveis",
  icons:["coracoes-1", "coracoes-2", "coracoes-3", "coracoes-4", "coracoes-5", "coracoes-6", "coracoes-7", "coracoes-8", "coracoes-9", "coracoes-10", "coracoes-11"]
 }
];

const iconMap = new Map(iconCatalog.map(icon=>[icon.key, icon]));

function mountLocalFontFaces(){
 return;
}

function renderWatermark(){
 const layer = document.getElementById("watermarkLayer");
 if(!layer){
  return;
 }

 const approximateRowHeight = window.innerWidth <= 640 ? 66 : 92;
 const rowCount = Math.ceil(window.innerHeight / approximateRowHeight) + 2;

 layer.innerHTML = Array.from({ length:rowCount }, ()=>`
<div class="watermark-word">${WATERMARK_TEXT}</div>`.trim()).join("");
}

function canRenderBottleModel(){
 return Boolean(window.THREE);
}

function normalizeBottleGeometryForHorizontalDisplay(geometry){
 geometry.computeVertexNormals();
 geometry.computeBoundingBox();

 const size = new THREE.Vector3();
 geometry.boundingBox.getSize(size);

 if(size.y >= size.x && size.y >= size.z){
  geometry.rotateZ(-Math.PI / 2);
 }else if(size.z >= size.x && size.z >= size.y){
  geometry.rotateY(Math.PI / 2);
 }

 geometry.computeBoundingBox();
 geometry.boundingBox.getSize(size);

 if(size.y < size.z){
  geometry.rotateX(Math.PI / 2);
 }

 geometry.computeBoundingBox();
 geometry.center();
 return geometry;
}

function parseBinarySTL(arrayBuffer){
 if(!window.THREE || !arrayBuffer){
  return null;
 }

 const view = new DataView(arrayBuffer);
 if(view.byteLength < 84){
  return null;
 }

 const faceCount = view.getUint32(80, true);
 const expectedLength = 84 + (faceCount * 50);
 if(expectedLength > view.byteLength){
  return null;
 }

 const positions = new Float32Array(faceCount * 9);
 const normals = new Float32Array(faceCount * 9);
 let offset = 84;

 for(let face = 0; face < faceCount; face++){
  const normalX = view.getFloat32(offset, true);
  const normalY = view.getFloat32(offset + 4, true);
  const normalZ = view.getFloat32(offset + 8, true);
  offset += 12;

  for(let vertex = 0; vertex < 3; vertex++){
   const index = (face * 9) + (vertex * 3);
   positions[index] = view.getFloat32(offset, true);
   positions[index + 1] = view.getFloat32(offset + 4, true);
   positions[index + 2] = view.getFloat32(offset + 8, true);

   normals[index] = normalX;
   normals[index + 1] = normalY;
   normals[index + 2] = normalZ;
   offset += 12;
  }

  offset += 2;
 }

 const geometry = new THREE.BufferGeometry();
 geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
 geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
 return geometry;
}

function loadBottleGeometry(){
 if(bottleGeometryPromise){
  return bottleGeometryPromise;
 }

 if(!canRenderBottleModel()){
  bottleGeometryPromise = Promise.resolve(null);
  return bottleGeometryPromise;
 }

 bottleGeometryPromise = new Promise(resolve=>{
  try{
   let geometry = null;

   if(window.__MODEL_STL_BASE64__){
    geometry = parseBinarySTL(base64ToArrayBuffer(window.__MODEL_STL_BASE64__));
   }

   if(!geometry){
    resolve(null);
    return;
   }

   resolve(normalizeBottleGeometryForHorizontalDisplay(geometry));
  }catch(error){
   console.error(error);
   resolve(null);
  }
 });

 return bottleGeometryPromise;
}

function sampleSteelTone(progress){
 const stops = [
  "#596066",
  "#cfd4d9",
  "#7a828a",
  "#eef1f3",
  "#8f969d",
  "#4f565d"
 ];

 const clamped = Math.max(0, Math.min(0.9999, progress));
 const scaled = clamped * (stops.length - 1);
 const index = Math.floor(scaled);
 const ratio = scaled - index;

 return mixHex(stops[index], stops[Math.min(index + 1, stops.length - 1)], ratio);
}

function createBottleModelGeometryForTheme(baseGeometry, palette){
 const geometry = baseGeometry.clone();
 geometry.computeBoundingBox();

 const position = geometry.getAttribute("position");
 const colorArray = new Float32Array(position.count * 3);
 const xMin = geometry.boundingBox.min.x;
 const xMax = geometry.boundingBox.max.x;
 const span = Math.max(1, xMax - xMin);
 const color = new THREE.Color();

 for(let i = 0; i < position.count; i++){
  const xNorm = (position.getX(i) - xMin) / span;
  let hex = palette.body;

  if(xNorm >= 0.9){
   hex = sampleSteelTone((xNorm - 0.9) / 0.1);
  }else if(xNorm >= 0.08 && xNorm <= 0.18){
   hex = sampleSteelTone((xNorm - 0.08) / 0.10);
  }else if(xNorm < 0.08){
   hex = palette.front;
  }else if(xNorm < 0.24){
   hex = palette.neck;
  }

  color.set(hex);
  colorArray[i * 3] = color.r;
  colorArray[(i * 3) + 1] = color.g;
  colorArray[(i * 3) + 2] = color.b;
 }

 geometry.setAttribute("color", new THREE.Float32BufferAttribute(colorArray, 3));
 return geometry;
}

function canvasHasVisiblePixels(renderer, width, height){
 if(!renderer){
  return false;
 }

 try{
  const gl = renderer.getContext();
  const samples = [
   [Math.floor(width * 0.5), Math.floor(height * 0.5)],
   [Math.floor(width * 0.35), Math.floor(height * 0.5)],
   [Math.floor(width * 0.65), Math.floor(height * 0.5)],
   [Math.floor(width * 0.5), Math.floor(height * 0.35)],
   [Math.floor(width * 0.5), Math.floor(height * 0.65)]
  ];
  const pixel = new Uint8Array(4);

  for(const [x, y] of samples){
   gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
   if(pixel[3] > 0){
    return true;
   }
  }
 }catch(error){
  console.error(error);
 }

 return false;
}

async function renderBottleModelDataUrl(theme){
 if(bottleModelCache.has(theme)){
  return bottleModelCache.get(theme);
 }

 const geometry = await loadBottleGeometry();
 if(!geometry || !canRenderBottleModel()){
  return null;
 }

 const palette = getBottleTheme(theme);
 const renderPromise = new Promise(resolve=>{
  const width = 1400;
  const height = 375;
  const aspect = width / height;
  const scene = new THREE.Scene();
  const renderGeometry = createBottleModelGeometryForTheme(geometry, palette);

  renderGeometry.computeBoundingBox();
  const size = new THREE.Vector3();
  renderGeometry.boundingBox.getSize(size);

  const material = new THREE.MeshStandardMaterial({
   vertexColors:true,
   roughness: 0.88,
   metalness: 0.12,
   side:THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(renderGeometry, material);
  mesh.rotation.y = -0.06;
  mesh.rotation.x = 0.02;
  scene.add(mesh);

  const ambient = new THREE.AmbientLight(0xffffff, 1.7);
  const key = new THREE.DirectionalLight(0xffffff, 1.3);
  const fill = new THREE.DirectionalLight(0xffffff, 0.75);
  const rim = new THREE.DirectionalLight(0xffffff, 0.5);

  key.position.set(2.8, 2.2, 3.5);
  fill.position.set(-2.2, 0.8, 2.4);
  rim.position.set(-1.5, 2.6, -2.8);

  scene.add(ambient, key, fill, rim);

  const halfHeight = Math.max(size.y / 2, size.x / (2 * aspect)) * 1.18;
  const cameraDistance = Math.max(size.z * 3.2, size.x * 1.15, size.y * 1.4, 600);
  const camera = new THREE.OrthographicCamera(
   -halfHeight * aspect,
   halfHeight * aspect,
   halfHeight,
   -halfHeight,
   0.1,
   cameraDistance + (size.z * 8) + 1000
  );

  camera.position.set(0, 0, cameraDistance);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
   antialias:true,
   alpha:true,
   preserveDrawingBuffer:true
  });

  try{
   renderer.setPixelRatio(1);
   renderer.setSize(width, height, false);
   renderer.setClearColor(0x000000, 0);
   renderer.outputColorSpace = THREE.SRGBColorSpace;
   renderer.render(scene, camera);

   if(!canvasHasVisiblePixels(renderer, width, height)){
    resolve(null);
    return;
   }

   resolve(renderer.domElement.toDataURL("image/png"));
  }catch(error){
   console.error(error);
   resolve(null);
  }finally{
   renderGeometry.dispose();
   material.dispose();
   renderer.dispose();
  }
 });

 bottleModelCache.set(theme, renderPromise);
 return renderPromise;
}

function renderBottleFrameInto(frameSlot, theme){
 if(!frameSlot){
  return;
 }

 frameSlot.dataset.themeKey = theme;
 frameSlot.innerHTML = buildBottleFrame(theme);
}

function getPreviewFitConfig(text){
 const length = Math.max(1, String(text || "").trim().length);

 return {
  widthRatio: Math.min(0.995, 0.95 + Math.max(0, length - 6) * 0.005),
  heightRatio: length <= 8 ? 0.90 : length <= 12 ? 0.87 : length <= 18 ? 0.84 : 0.81,
  minSize:28,
  maxSize:320
 };
}

function getMeasureCanvas(){
 if(!textMeasureCanvas){
  textMeasureCanvas = document.createElement("canvas");
 }

 return textMeasureCanvas;
}

function base64ToArrayBuffer(base64){
 const binary = atob(base64);
 const bytes = new Uint8Array(binary.length);

 for(let i = 0; i < binary.length; i++){
  bytes[i] = binary.charCodeAt(i);
 }

 return bytes.buffer;
}

async function getOpenTypeFont(font){
 if(!font.isLocal || !window.opentype){
  return null;
 }

 if(openTypeFontCache.has(font.cssFamily)){
  return openTypeFontCache.get(font.cssFamily);
 }

 try{
  const fontData = window.__FONT_DATA__ && window.__FONT_DATA__[font.cssFamily];
  if(!fontData || !fontData.base64){
   openTypeFontCache.set(font.cssFamily, null);
   return null;
  }

  const parsedFont = window.opentype.parse(base64ToArrayBuffer(fontData.base64));
  openTypeFontCache.set(font.cssFamily, parsedFont);
  return parsedFont;
 }catch(error){
  console.error(error);
  openTypeFontCache.set(font.cssFamily, null);
  return null;
 }
}

function create(){
 fixedFonts.forEach(font=>{
  document.getElementById("fixedList").appendChild(createItem(font));
 });

 suggestFonts.forEach(font=>{
  document.getElementById("suggestList").appendChild(createItem(font));
 });
}

function createItem(font){
 const el = document.createElement("div");
 el.className = "item";
 el.dataset.bottleTheme = "preto";
 el.dataset.iconKey = "";
 const actionLabel = isAppleMobile()
  ? "Compartilhar PDF"
  : "Compartilhar no WhatsApp";

 el.innerHTML = `
 <div class="bottle">
  <div class="bottle-frame-slot">
   ${buildBottleFrame(el.dataset.bottleTheme)}
  </div>
  <div class="bottle-preview">
   <div class="preview-svg" data-font-id="${font.id}"></div>
  </div>
 <div class="bottle-shadow"></div>
 </div>

 <div class="picker-shell">
  <div class="bottle-tools">
   <span class="color-dot" aria-hidden="true"></span>
   <button class="color-toggle" type="button" aria-expanded="false" onclick="toggleColorMenu(this)">Alterar cor</button>
   <button class="icon-toggle" type="button" aria-expanded="false" onclick="toggleIconMenu(this)">Adicionar ícone</button>
  </div>
  <div class="color-menu-panel">
   ${buildColorMenu()}
  </div>
  <div class="icon-menu-panel">
   ${buildIconMenu()}
  </div>
 </div>

 <div class="font-name">${font.label}</div>

 <div class="actions">
  <button class="action green" onclick="enviarWhats(this, '${font.id}')">${actionLabel}</button>
 </div>
 `;

 syncBottleTheme(el);
 syncBottleIcon(el);
 return el;
}

function getBottleTheme(theme = "preto"){
 const aliases = {
  black:"preto",
  white:"branco"
 };

 const key = aliases[theme] || theme;
 return bottleThemes[key] || bottleThemes.preto;
}

function buildColorMenu(){
 return bottleColorGroups.map(group=>`
<div class="color-menu-group">
 <div class="color-menu-title">${group.title}</div>
 <div class="color-menu-grid">
  ${group.colors.map(colorKey=>{
   const palette = getBottleTheme(colorKey);
   return `
  <button
   class="color-option"
   type="button"
   data-color-key="${palette.key}"
   aria-pressed="false"
   onclick="selectBottleColor(this, '${palette.key}')"
  >
   <span class="color-option-swatch" style="--swatch:${palette.dot};--swatch-border:${palette.dotBorder};"></span>
   <span class="color-option-label">${palette.label}</span>
  </button>`.trim();
  }).join("")}
 </div>
</div>`.trim()).join("");
}

function getIconDefinition(key){
 return key ? (iconMap.get(key) || null) : null;
}

function buildIconPreviewMarkup(icon){
 return `<img src="${escapeXml(icon.src)}" alt="${escapeXml(icon.label)}" loading="lazy">`;
}

function buildIconMenu(){
 const clearOption = `
<div class="icon-menu-header">
 <div class="icon-menu-grid">
  <button class="icon-option" type="button" data-icon-key="" aria-pressed="true" onclick="selectBottleIcon(this, '')">
   <span class="icon-option-art icon-option-art-empty">+</span>
   <span class="icon-option-label">Sem ícone</span>
  </button>
 </div>
</div>`.trim();

 const groupsMarkup = iconGroups.map(group=>`
<div class="color-menu-group">
 <div class="color-menu-title">${group.title}</div>
 <div class="icon-menu-grid">
  ${group.icons.map(iconKey=>{
   const icon = getIconDefinition(iconKey);
   return `
  <button
   class="icon-option"
   type="button"
   data-icon-key="${icon.key}"
   aria-pressed="false"
   onclick="selectBottleIcon(this, '${icon.key}')"
  >
   <span class="icon-option-art">${buildIconPreviewMarkup(icon)}</span>
   <span class="icon-option-label">${icon.label}</span>
  </button>`.trim();
  }).join("")}
 </div>
</div>`.trim()).join("");

 return `${clearOption}${groupsMarkup}`;
}

function buildBottleFrame(theme = "preto"){
 const palette = getBottleTheme(theme);
 const matteId = palette.key;
 const bodyTop = mixHex(palette.body, "#ffffff", palette.light ? 0.055 : 0.035);
 const bodyMid = mixHex(palette.body, "#ffffff", palette.light ? 0.024 : 0.012);
 const bodyBottom = mixHex(palette.body, "#000000", palette.light ? 0.10 : 0.14);
 const grainWhiteOpacity = palette.light ? "0.08" : "0.05";
 const grainDarkOpacity = palette.light ? "0.04" : "0.06";
 const grainStrokeWhite = palette.light ? "0.045" : "0.03";
 const grainStrokeDark = palette.light ? "0.03" : "0.04";
 const outlineColor = "#373435";
 const whiteStrokeOpacity = palette.light ? "0.72" : "0.94";

 return `
<svg class="bottle-frame" viewBox="-1000 4180 11150 3860" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
 <defs>
  <linearGradient id="steel-fill-${matteId}" x1="0%" y1="0%" x2="100%" y2="0%">
   <stop offset="0%" stop-color="#5f666d"/>
   <stop offset="20%" stop-color="#cfd4d9"/>
   <stop offset="46%" stop-color="#7f878f"/>
   <stop offset="66%" stop-color="#eef1f3"/>
   <stop offset="84%" stop-color="#8e959d"/>
   <stop offset="100%" stop-color="#585f66"/>
  </linearGradient>
  <linearGradient id="body-fill-${matteId}" x1="0%" y1="0%" x2="0%" y2="100%">
   <stop offset="0%" stop-color="${bodyTop}"/>
   <stop offset="45%" stop-color="${bodyMid}"/>
   <stop offset="100%" stop-color="${bodyBottom}"/>
  </linearGradient>
  <pattern id="matte-grain-${matteId}" width="32" height="32" patternUnits="userSpaceOnUse">
   <rect width="32" height="32" fill="transparent"/>
   <circle cx="6" cy="7" r="0.9" fill="#ffffff" fill-opacity="${grainWhiteOpacity}"/>
   <circle cx="20" cy="11" r="0.7" fill="#000000" fill-opacity="${grainDarkOpacity}"/>
   <circle cx="11" cy="23" r="0.8" fill="#ffffff" fill-opacity="${grainWhiteOpacity}"/>
   <circle cx="25" cy="25" r="0.7" fill="#000000" fill-opacity="${grainDarkOpacity}"/>
   <path d="M4 16 H9" stroke="#ffffff" stroke-opacity="${grainStrokeWhite}" stroke-width="0.45" stroke-linecap="round"/>
   <path d="M21 6 H26" stroke="#000000" stroke-opacity="${grainStrokeDark}" stroke-width="0.45" stroke-linecap="round"/>
  </pattern>
 </defs>
 <g stroke="${outlineColor}" stroke-width="8.47" stroke-miterlimit="22.9256">
  <path d="M9632.95 6061.61c0,864.86 -241.57,1605.13 -583.74,1909.4l466.48 1.17c347.15,-298.74 584.87,-1037.6 584.87,-1910.57 0,-818.9 -216.56,-1526.06 -530.05,-1857.22l-467.61 0c313.49,331.17 530.05,1038.32 530.05,1857.22z" fill="url(#steel-fill-${matteId})"/>
  <path d="M906.03 6073.29c0,-610.94 -121.71,-1159.42 -314.7,-1534.55l-1036.27 0c-278.07,0 -505.5,227.46 -505.5,505.49l0 793.14 0 471.84 0 779.04c0,278.03 227.43,505.48 505.46,505.48l1043.48 0c188.82,-374.7 307.53,-917.1 307.53,-1520.44zm-814.02 19.47c0,421.49 66.05,811.21 177.97,1127.68 -65.5,73.29 -160.66,119.61 -266.1,119.61l-296.85 0c-196.39,0 -357.07,-160.66 -357.07,-357.06l0 -1842.76c0,-196.4 160.68,-357.07 357.07,-357.07l296.85 0c114.25,0 216.44,54.38 281.92,138.54 -121.49,323.93 -193.79,730.12 -193.79,1171.06z" fill="url(#body-fill-${matteId})"/>
  <path d="M591.33 4538.74c192.99,375.13 314.7,923.61 314.7,1534.55 0,603.34 -118.71,1145.74 -307.53,1520.44l489.12 0c181.15,-375.36 294.33,-908.97 294.33,-1500.95 0,-620.48 -124.33,-1176.82 -320.94,-1554.04l-469.68 0z" fill="url(#body-fill-${matteId})"/>
  <path d="M1061.01 4538.74c196.61,377.22 320.94,933.56 320.94,1554.04 0,591.98 -113.18,1125.59 -294.33,1500.95 -10.83,22.45 -21.9,44.31 -33.21,65.6l444.87 0c206.47,-377.37 338.05,-947.78 338.05,-1586.04 0,-638.3 -131.6,-1208.71 -338.07,-1586.08 -4.21,-7.71 -8.46,-15.34 -12.74,-22.89l-466.6 0c14.01,23.95 27.72,48.78 41.09,74.42z" fill="url(#body-fill-${matteId})"/>
  <path d="M1499.26 4487.21c206.47,377.37 338.07,947.78 338.07,1586.08 0,638.26 -131.58,1208.67 -338.05,1586.04 144.56,220.05 239.52,332.13 533.56,329.36 81.16,-0.78 287.12,-1.96 353.5,-1.96l5986.01 0 467.61 0 209.25 -15.72c342.17,-304.27 583.74,-1044.54 583.74,-1909.4 0,-818.9 -216.56,-1526.05 -530.05,-1857.22l-802.51 0 -5912.48 0c-101.18,-2.53 -269.88,-0.57 -355.07,3.16 -188.43,8.26 -369.17,56.26 -517.34,256.88 -5.44,7.39 -10.85,14.97 -16.24,22.78z" fill="url(#body-fill-${matteId})"/>
  <path d="M1837.33 6073.29c0,-638.3 -131.6,-1208.71 -338.07,-1586.08 -4.21,-7.71 -8.46,-15.34 -12.74,-22.89l-466.6 0c14.01,23.95 27.72,48.78 41.09,74.42 196.61,377.22 320.94,933.56 320.94,1554.04 0,591.98 -113.18,1125.59 -294.33,1500.95 -10.83,22.45 -21.9,44.31 -33.21,65.6l444.87 0c206.47,-377.37 338.05,-947.78 338.05,-1586.04z" fill="url(#steel-fill-${matteId})"/>
 </g>
 <g fill="url(#matte-grain-${matteId})" opacity="0.32">
  <path d="M906.03 6073.29c0,-610.94 -121.71,-1159.42 -314.7,-1534.55l-1036.27 0c-278.07,0 -505.5,227.46 -505.5,505.49l0 793.14 0 471.84 0 779.04c0,278.03 227.43,505.48 505.46,505.48l1043.48 0c188.82,-374.7 307.53,-917.1 307.53,-1520.44zm-814.02 19.47c0,421.49 66.05,811.21 177.97,1127.68 -65.5,73.29 -160.66,119.61 -266.1,119.61l-296.85 0c-196.39,0 -357.07,-160.66 -357.07,-357.06l0 -1842.76c0,-196.4 160.68,-357.07 357.07,-357.07l296.85 0c114.25,0 216.44,54.38 281.92,138.54 -121.49,323.93 -193.79,730.12 -193.79,1171.06z"/>
  <path d="M591.33 4538.74c192.99,375.13 314.7,923.61 314.7,1534.55 0,603.34 -118.71,1145.74 -307.53,1520.44l489.12 0c181.15,-375.36 294.33,-908.97 294.33,-1500.95 0,-620.48 -124.33,-1176.82 -320.94,-1554.04l-469.68 0z"/>
  <path d="M1061.01 4538.74c196.61,377.22 320.94,933.56 320.94,1554.04 0,591.98 -113.18,1125.59 -294.33,1500.95 -10.83,22.45 -21.9,44.31 -33.21,65.6l444.87 0c206.47,-377.37 338.05,-947.78 338.05,-1586.04 0,-638.3 -131.6,-1208.71 -338.07,-1586.08 -4.21,-7.71 -8.46,-15.34 -12.74,-22.89l-466.6 0c14.01,23.95 27.72,48.78 41.09,74.42z"/>
  <path d="M1499.26 4487.21c206.47,377.37 338.07,947.78 338.07,1586.08 0,638.26 -131.58,1208.67 -338.05,1586.04 144.56,220.05 239.52,332.13 533.56,329.36 81.16,-0.78 287.12,-1.96 353.5,-1.96l5986.01 0 467.61 0 209.25 -15.72c342.17,-304.27 583.74,-1044.54 583.74,-1909.4 0,-818.9 -216.56,-1526.05 -530.05,-1857.22l-802.51 0 -5912.48 0c-101.18,-2.53 -269.88,-0.57 -355.07,3.16 -188.43,8.26 -369.17,56.26 -517.34,256.88 -5.44,7.39 -10.85,14.97 -16.24,22.78z"/>
 </g>
 <g fill="none" stroke="#ffffff" stroke-opacity="${whiteStrokeOpacity}" stroke-width="20" stroke-miterlimit="22.9256">
  <path d="M9102.9 4204.39c313.49,331.17 530.05,1038.32 530.05,1857.22 0,880.15 -250.18,1631.25 -601.98,1925.12"/>
  <path d="M9570.51 4204.39c313.49,331.16 530.05,1038.32 530.05,1857.22 0,880.16 -241.66,1624 -593.48,1917.87"/>
  <path d="M1486.52 4464.32c213.79,376.99 350.81,957.63 350.81,1608.97 0,638.26 -131.58,1208.67 -338.05,1586.04"/>
  <path d="M1019.92 4464.32c220.22,376.28 362.03,965.8 362.03,1628.46 0,627.38 -127.12,1189.2 -327.54,1566.55"/>
  <path d="M-950.44 6309.21c-4.03,-77.41 -6.12,-156.13 -6.12,-235.92 0,-79.79 2.09,-158.51 6.12,-235.92m1541.77 -1298.63c192.99,375.13 314.7,923.61 314.7,1534.55 0,603.34 -118.71,1145.74 -307.53,1520.44"/>
  <path d="M269.98 7220.44c-111.92,-316.47 -177.97,-706.19 -177.97,-1127.68 0,-440.94 72.3,-847.13 193.79,-1171.06"/>
  <path d="M1499.28 4487.21c151.1,-219.82 338.21,-271.1 533.56,-279.66 85.19,-3.73 253.89,-5.69 355.07,-3.16m-1.57 3782.37c-66.38,-0.03 -272.34,1.15 -353.5,1.93 -294.04,2.77 -389,-109.31 -533.56,-329.36"/>
  <path d="M269.98 7220.44c-65.5,73.29 -160.66,119.61 -266.1,119.61l-296.85 0c-196.39,0 -357.07,-160.66 -357.07,-357.06l0 -1842.76c0,-196.4 160.68,-357.07 357.07,-357.07l296.85 0c114.25,0 216.44,54.38 281.9,138.54"/>
  <path d="M-444.94 7593.73c-278.07,0 -505.5,-227.45 -505.5,-505.48l0 -2044.02c0,-278.03 227.43,-505.49 505.5,-505.49"/>
  <line x1="2172.02" y1="7986.73" x2="8372.35" y2="7986.73" />
  <line x1="2274.89" y1="4204.39" x2="8300.39" y2="4204.39" />
  <polyline points="8372.35,7986.73 8839.96,7986.73 9049.21,7971.01"/>
  <line x1="8300.39" y1="4204.39" x2="9102.9" y2="4204.39" />
  <line x1="-444.98" y1="7593.73" x2="598.5" y2="7593.73" />
  <line x1="-444.98" y1="4538.74" x2="591.33" y2="4538.74" />
  <line x1="598.5" y1="7593.73" x2="1087.62" y2="7593.73" />
  <line x1="591.33" y1="4538.74" x2="1061.01" y2="4538.74" />
  <line x1="1499.28" y1="7659.33" x2="1054.41" y2="7659.33" />
  <line x1="1515.36" y1="4464.32" x2="1019.92" y2="4464.32" />
 </g>
 <g fill="none" stroke="#000000" stroke-width="20" stroke-miterlimit="22.9256">
  <line x1="9049.21" y1="7971.01" x2="9515.71" y2="7972.18" />
  <line x1="9570.51" y1="4204.39" x2="9102.9" y2="4204.39" />
 </g>
</svg>`.trim();
}

function syncBottleTheme(item){
 if(!item){
  return;
 }

 const theme = item.dataset.bottleTheme || "preto";
 const palette = getBottleTheme(theme);
 const frameSlot = item.querySelector(".bottle-frame-slot");
 const colorDot = item.querySelector(".color-dot");

 if(frameSlot){
  renderBottleFrameInto(frameSlot, theme);
 }

 if(colorDot){
  colorDot.style.background = palette.dot;
  colorDot.style.borderColor = palette.dotBorder;
 }

 const toggle = item.querySelector(".color-toggle");
 if(toggle){
  toggle.setAttribute("aria-label", `Alterar cor. Cor atual: ${palette.label}`);
 }

 item.querySelectorAll(".color-option").forEach(option=>{
  const selected = option.dataset.colorKey === palette.key;
  option.classList.toggle("is-selected", selected);
  option.setAttribute("aria-pressed", selected ? "true" : "false");
 });
}

function syncBottleIcon(item){
 if(!item){
  return;
 }

 const icon = getIconDefinition(item.dataset.iconKey || "");
 const toggle = item.querySelector(".icon-toggle");

 if(toggle){
  toggle.textContent = icon ? `Ícone: ${icon.label}` : "Adicionar ícone";
  toggle.setAttribute("aria-label", icon ? `Alterar ícone. Atual: ${icon.label}` : "Adicionar ícone");
 }

 item.querySelectorAll(".icon-option").forEach(option=>{
  const selected = option.dataset.iconKey === (item.dataset.iconKey || "");
  option.classList.toggle("is-selected", selected);
  option.setAttribute("aria-pressed", selected ? "true" : "false");
 });
}

function closePickerMenus(exceptItem = null){
 document.querySelectorAll(".item.color-menu-open").forEach(item=>{
  if(item !== exceptItem){
   item.classList.remove("color-menu-open");
  }
 });

 document.querySelectorAll(".item.icon-menu-open").forEach(item=>{
  if(item !== exceptItem){
   item.classList.remove("icon-menu-open");
  }
 });

 document.querySelectorAll(".item").forEach(item=>{
  if(item !== exceptItem){
   const colorToggle = item.querySelector(".color-toggle");
   const iconToggle = item.querySelector(".icon-toggle");

   if(colorToggle){
    colorToggle.setAttribute("aria-expanded", "false");
   }

   if(iconToggle){
    iconToggle.setAttribute("aria-expanded", "false");
   }
  }
 });
}

function closeColorMenus(exceptItem = null){
 closePickerMenus(exceptItem);
}

function toggleColorMenu(control){
 const item = control.closest(".item");
 if(!item){
  return;
 }

 const isOpen = item.classList.contains("color-menu-open");
 closePickerMenus(item);
 item.classList.remove("icon-menu-open");
 const iconToggle = item.querySelector(".icon-toggle");
 if(iconToggle){
  iconToggle.setAttribute("aria-expanded", "false");
 }
 item.classList.toggle("color-menu-open", !isOpen);
 control.setAttribute("aria-expanded", isOpen ? "false" : "true");
}

function toggleIconMenu(control){
 const item = control.closest(".item");
 if(!item){
  return;
 }

 const isOpen = item.classList.contains("icon-menu-open");
 closePickerMenus(item);
 item.classList.remove("color-menu-open");
 const colorToggle = item.querySelector(".color-toggle");
 if(colorToggle){
  colorToggle.setAttribute("aria-expanded", "false");
 }
 item.classList.toggle("icon-menu-open", !isOpen);
 control.setAttribute("aria-expanded", isOpen ? "false" : "true");
}

async function selectBottleColor(control, theme){
 const item = control.closest(".item");
 if(!item){
  return;
 }

 item.dataset.bottleTheme = theme;
 syncBottleTheme(item);

 const preview = item.querySelector(".preview-svg");
 if(preview){
  await drawPreviewSvg(preview);
 }

 item.classList.remove("color-menu-open");
 const toggle = item.querySelector(".color-toggle");
 if(toggle){
  toggle.setAttribute("aria-expanded", "false");
 }
}

async function selectBottleIcon(control, iconKey){
 const item = control.closest(".item");
 if(!item){
  return;
 }

 item.dataset.iconKey = iconKey;
 syncBottleIcon(item);

 const preview = item.querySelector(".preview-svg");
 if(preview){
  await drawPreviewSvg(preview);
 }

 item.classList.remove("icon-menu-open");
 const toggle = item.querySelector(".icon-toggle");
 if(toggle){
  toggle.setAttribute("aria-expanded", "false");
 }
}

function isCursive(font){
 return font.toLowerCase().includes("script") ||
        font.toLowerCase().includes("vibes") ||
        font.toLowerCase().includes("brush") ||
        font.toLowerCase().includes("autography") ||
        font.toLowerCase().includes("honey") ||
        font.toLowerCase().includes("swash") ||
        font.toLowerCase().includes("nickainley");
}

function fitOpenTypeSize(fontObject, text, maxWidth, maxHeight, options = {}){
 const minSize = options.minSize || 18;
 const maxSize = options.maxSize || 280;
 let low = minSize;
 let high = maxSize;
 let bestPath = fontObject.getPath(text, 0, 0, minSize, { kerning:true });
 let bestBox = bestPath.getBoundingBox();
 let bestSize = minSize;

 while(low <= high){
  const size = Math.floor((low + high) / 2);
  const path = fontObject.getPath(text, 0, 0, size, { kerning:true });
  const box = path.getBoundingBox();
  const currentWidth = box.x2 - box.x1;
  const currentHeight = box.y2 - box.y1;

  if(currentWidth <= maxWidth && currentHeight <= maxHeight){
   bestPath = path;
   bestBox = box;
   bestSize = size;
   low = size + 1;
  }else{
   high = size - 1;
  }
 }

 return { size:bestSize, box:bestBox, path:bestPath };
}

function getIconLayoutMetrics(icon, referenceHeight){
 if(!icon){
  return {
   width:0,
   height:0,
   gap:0
  };
 }

 const iconHeight = Math.max(referenceHeight * 0.94, 18);
 const iconWidth = iconHeight * (icon.width / icon.height);
 const gap = Math.max(referenceHeight * 0.18, 14);

 return {
  width:iconWidth,
  height:iconHeight,
  gap
 };
}

function fitOpenTypeComposite(fontObject, text, icon, maxWidth, maxHeight, options = {}){
 const minSize = Math.max(14, Math.floor((options.minSize || 18) * 0.72));
 const maxSize = options.maxSize || 280;
 let low = minSize;
 let high = maxSize;
 let best = null;

 while(low <= high){
  const size = Math.floor((low + high) / 2);
  const path = fontObject.getPath(text, 0, 0, size, { kerning:true });
  const box = path.getBoundingBox();
  const textWidth = box.x2 - box.x1;
  const textHeight = box.y2 - box.y1;
  const iconLayout = getIconLayoutMetrics(icon, textHeight);
  const combinedWidth = textWidth + iconLayout.gap + iconLayout.width;
  const combinedHeight = Math.max(textHeight, iconLayout.height);

  if(combinedWidth <= maxWidth && combinedHeight <= maxHeight){
   best = {
    size,
    box,
    textWidth,
    textHeight,
    iconWidth:iconLayout.width,
    iconHeight:iconLayout.height,
    iconGap:iconLayout.gap,
    combinedWidth,
    combinedHeight
   };
   low = size + 1;
  }else{
   high = size - 1;
  }
 }

 if(best){
  return best;
 }

 const fallback = fitOpenTypeSize(fontObject, text, maxWidth, maxHeight, options);
 return {
  size:fallback.size,
  box:fallback.box,
  textWidth:fallback.box.x2 - fallback.box.x1,
  textHeight:fallback.box.y2 - fallback.box.y1,
  iconWidth:0,
  iconHeight:0,
  iconGap:0,
  combinedWidth:fallback.box.x2 - fallback.box.x1,
  combinedHeight:fallback.box.y2 - fallback.box.y1
 };
}

function buildOpenTypePath(fontObject, text, width, height, widthRatio = PREVIEW_PATH_WIDTH_RATIO, heightRatio = PREVIEW_PATH_HEIGHT_RATIO, options = {}){
 const fit = fitOpenTypeSize(fontObject, text, width * widthRatio, height * heightRatio, options);
 const x = (width / 2) - ((fit.box.x1 + fit.box.x2) / 2);
 const y = (height / 2) - ((fit.box.y1 + fit.box.y2) / 2);

 return fontObject.getPath(text, x, y, fit.size, { kerning:true });
}

function escapeXml(value){
 return String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&apos;");
}

function pathToSvgData(path){
 return path.commands.map(command=>{
  if(command.type === "M"){
   return `M ${command.x} ${command.y}`;
  }

  if(command.type === "L"){
   return `L ${command.x} ${command.y}`;
  }

  if(command.type === "C"){
   return `C ${command.x1} ${command.y1} ${command.x2} ${command.y2} ${command.x} ${command.y}`;
  }

  if(command.type === "Q"){
   return `Q ${command.x1} ${command.y1} ${command.x} ${command.y}`;
  }

  if(command.type === "Z"){
   return "Z";
  }

  return "";
 }).join(" ");
}

function fitSvgTextSize(text, fontFamily, maxWidth, maxHeight, options = {}){
 const canvas = getMeasureCanvas();
 const ctx = canvas.getContext("2d");
 const minSize = options.minSize || 24;
 const maxSize = options.maxSize || 280;
 let low = minSize;
 let high = maxSize;
 let bestSize = minSize;

 while(low <= high){
  const size = Math.floor((low + high) / 2);
  ctx.font = `600 ${size}px "${fontFamily}"`;
  const metrics = ctx.measureText(text);
  const measuredHeight = Math.max(
   (metrics.actualBoundingBoxAscent || size * 0.7) + (metrics.actualBoundingBoxDescent || size * 0.25),
   size * 0.82
  );

  if(metrics.width <= maxWidth && measuredHeight <= maxHeight){
   bestSize = size;
   low = size + 1;
  }else{
   high = size - 1;
  }
 }

 return bestSize;
}

function fitSvgTextComposite(text, fontFamily, icon, maxWidth, maxHeight, options = {}){
 const canvas = getMeasureCanvas();
 const ctx = canvas.getContext("2d");
 const minSize = Math.max(14, Math.floor((options.minSize || 24) * 0.72));
 const maxSize = options.maxSize || 280;
 let low = minSize;
 let high = maxSize;
 let best = null;

 while(low <= high){
  const size = Math.floor((low + high) / 2);
  ctx.font = `600 ${size}px "${fontFamily}"`;
  const metrics = ctx.measureText(text);
  const textHeight = Math.max(
   (metrics.actualBoundingBoxAscent || size * 0.7) + (metrics.actualBoundingBoxDescent || size * 0.25),
   size * 0.82
  );
  const iconLayout = getIconLayoutMetrics(icon, textHeight);
  const combinedWidth = metrics.width + iconLayout.gap + iconLayout.width;
  const combinedHeight = Math.max(textHeight, iconLayout.height);

  if(combinedWidth <= maxWidth && combinedHeight <= maxHeight){
   best = {
    size,
    textWidth:metrics.width,
    textHeight,
    iconWidth:iconLayout.width,
    iconHeight:iconLayout.height,
    iconGap:iconLayout.gap,
    combinedWidth,
    combinedHeight
   };
   low = size + 1;
  }else{
   high = size - 1;
  }
 }

 if(best){
  return best;
 }

 const size = fitSvgTextSize(text, fontFamily, maxWidth, maxHeight, options);
 ctx.font = `600 ${size}px "${fontFamily}"`;
 const metrics = ctx.measureText(text);
 const textHeight = Math.max(
  (metrics.actualBoundingBoxAscent || size * 0.7) + (metrics.actualBoundingBoxDescent || size * 0.25),
  size * 0.82
 );

 return {
  size,
  textWidth:metrics.width,
  textHeight,
  iconWidth:0,
  iconHeight:0,
  iconGap:0,
  combinedWidth:metrics.width,
  combinedHeight:textHeight
 };
}

function buildMetallicSilverDefs(id){
 return `
<defs>
 <linearGradient id="${id}" x1="0%" y1="0%" x2="0%" y2="100%">
  <stop offset="0%" stop-color="#fdfdfd"/>
  <stop offset="16%" stop-color="#d6d7da"/>
  <stop offset="34%" stop-color="#ffffff"/>
  <stop offset="52%" stop-color="#a7a9ac"/>
  <stop offset="74%" stop-color="#eef0f2"/>
  <stop offset="100%" stop-color="#7f8387"/>
 </linearGradient>
</defs>`.trim();
}

function buildMetallicSteelDarkDefs(id){
 return `
<defs>
 <linearGradient id="${id}" x1="0%" y1="0%" x2="0%" y2="100%">
  <stop offset="0%" stop-color="#f1f4f6"/>
  <stop offset="14%" stop-color="#9aa1a8"/>
  <stop offset="32%" stop-color="#4b5258"/>
  <stop offset="52%" stop-color="#d7dde1"/>
  <stop offset="72%" stop-color="#5b6269"/>
  <stop offset="100%" stop-color="#262b30"/>
 </linearGradient>
</defs>`.trim();
}

function resolveSvgFill(fill){
 if(fill === "metallic-silver"){
  const gradientId = `metallic-silver-${Math.random().toString(36).slice(2,10)}`;
  return {
   fill:`url(#${gradientId})`,
   defs:buildMetallicSilverDefs(gradientId),
   extraAttrs:'stroke="#ffffff" stroke-opacity="0.08" stroke-width="0.8" paint-order="stroke fill"'
  };
 }

 if(fill === "metallic-steel-dark"){
  const gradientId = `metallic-steel-dark-${Math.random().toString(36).slice(2,10)}`;
  return {
   fill:`url(#${gradientId})`,
   defs:buildMetallicSteelDarkDefs(gradientId),
   extraAttrs:'stroke="#f7f9fa" stroke-opacity="0.24" stroke-width="1.2" paint-order="stroke fill"'
  };
 }

 return { fill, defs:"", extraAttrs:"" };
}

async function buildSvgMarkup(font, text, width = 1600, height = 260, fill = "metallic-silver", iconKey = ""){
 const fillConfig = resolveSvgFill(fill);
 const previewFit = getPreviewFitConfig(text);
 const icon = getIconDefinition(iconKey);

 if(font.isLocal){
  const fontObject = await getOpenTypeFont(font);
  if(fontObject){
   return await buildOutlinedSvgMarkup(
    fontObject,
    text,
    width,
    height,
    true,
    previewFit.widthRatio,
    previewFit.heightRatio,
    fill,
    "",
    previewFit,
    icon
   );
  }
 }

 if(!icon){
  const fontSize = fitSvgTextSize(
   text,
   font.cssFamily,
   width * previewFit.widthRatio,
   height * previewFit.heightRatio,
   previewFit
  );
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;display:block">
 ${fillConfig.defs}
 <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="${escapeXml(font.cssFamily)}" font-size="${fontSize}" fill="${fillConfig.fill}" ${fillConfig.extraAttrs}>${escapeXml(text)}</text>
</svg>`.trim();
 }

 const fit = fitSvgTextComposite(
  text,
  font.cssFamily,
  icon,
  width * previewFit.widthRatio,
  height * previewFit.heightRatio,
  previewFit
 );
 const startX = (width - fit.combinedWidth) / 2;
 const iconX = startX + fit.textWidth + fit.iconGap;
 const iconY = (height - fit.iconHeight) / 2;
 return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;display:block">
 ${fillConfig.defs}
 <text x="${startX}" y="50%" dominant-baseline="middle" font-family="${escapeXml(font.cssFamily)}" font-size="${fit.size}" fill="${fillConfig.fill}" ${fillConfig.extraAttrs}>${escapeXml(text)}</text>
 ${buildPositionedIconMarkup(icon, iconX, iconY, fit.iconHeight, fillConfig.fill, fillConfig.extraAttrs)}
</svg>`.trim();
}

function buildPositionedIconMarkup(icon, x, y, iconHeight, paint, extraAttrs = ""){
 if(!icon || !iconHeight){
  return "";
 }

 const iconWidth = iconHeight * (icon.width / icon.height);

 if(icon.kind === "svg" && icon.markup){
  return `
<svg x="${x}" y="${y}" width="${iconWidth}" height="${iconHeight}" viewBox="${escapeXml(icon.viewBox || INLINE_ICON_VIEWBOX)}" preserveAspectRatio="xMidYMid meet" overflow="visible">
 <g fill="${paint}" fill-rule="evenodd" clip-rule="evenodd" ${extraAttrs}>${icon.markup}</g>
</svg>`.trim();
 }

 return "";
}

async function buildOutlinedSvgMarkup(fontObject, text, width, height, responsive = false, widthRatio = PREVIEW_PATH_WIDTH_RATIO, heightRatio = PREVIEW_PATH_HEIGHT_RATIO, fill = "#000000", defs = "", options = {}, icon = null){
 const fillConfig = resolveSvgFill(fill);
 const sizeAttrs = responsive
  ? `preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;display:block"`
  : `width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"`;

 if(!icon){
  const path = buildOpenTypePath(fontObject, text, width, height, widthRatio, heightRatio, options);
  const svgPath = pathToSvgData(path);
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" ${sizeAttrs}>
 ${defs || fillConfig.defs}
 <path d="${svgPath}" fill="${fillConfig.fill}" ${fillConfig.extraAttrs}/>
</svg>`.trim();
 }

 const fit = fitOpenTypeComposite(
  fontObject,
  text,
  icon,
  width * widthRatio,
  height * heightRatio,
  options
 );
 const startX = (width - fit.combinedWidth) / 2;
 const startY = (height - fit.combinedHeight) / 2;
 const textX = startX - fit.box.x1;
 const textY = startY + ((fit.combinedHeight - fit.textHeight) / 2) - fit.box.y1;
 const textPath = fontObject.getPath(text, textX, textY, fit.size, { kerning:true });
 const iconX = startX + fit.textWidth + fit.iconGap;
 const iconY = startY + ((fit.combinedHeight - fit.iconHeight) / 2);

 return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" ${sizeAttrs}>
 ${defs || fillConfig.defs}
 <path d="${pathToSvgData(textPath)}" fill="${fillConfig.fill}" ${fillConfig.extraAttrs}/>
 ${buildPositionedIconMarkup(icon, iconX, iconY, fit.iconHeight, fillConfig.fill, fillConfig.extraAttrs)}
</svg>`.trim();
}

async function buildOutlinedExportSvg(font, text, width = EXPORT_WIDTH, height = EXPORT_HEIGHT, iconKey = ""){
 if(!font.isLocal){
  throw new Error("Essa fonte não possui arquivo local para vetorização.");
 }

 const fontObject = await getOpenTypeFont(font);
 if(!fontObject){
  throw new Error(`Não foi possível vetorizar a fonte ${font.label}.`);
 }

 const icon = getIconDefinition(iconKey);
 return await buildOutlinedSvgMarkup(fontObject, text, width, height, false, EXPORT_PATH_WIDTH_RATIO, EXPORT_PATH_HEIGHT_RATIO, "#000000", "", {}, icon);
}

async function buildOutlinedExportPdf(font, text, width = EXPORT_WIDTH, height = EXPORT_HEIGHT, iconKey = ""){
 if(!font.isLocal){
  throw new Error("Essa fonte não possui arquivo local para vetorização.");
 }

 const fontObject = await getOpenTypeFont(font);
 if(!fontObject){
  throw new Error(`Não foi possível vetorizar a fonte ${font.label}.`);
 }

 const icon = getIconDefinition(iconKey);
 const svgMarkup = await buildOutlinedSvgMarkup(fontObject, text, width, height, false, EXPORT_PATH_WIDTH_RATIO, EXPORT_PATH_HEIGHT_RATIO, "#000000", "", {}, icon);
 const parser = new DOMParser();
 const svgDoc = parser.parseFromString(svgMarkup, "image/svg+xml");
 const svgElement = svgDoc.documentElement;

 svgElement.setAttribute("width", String(width));
 svgElement.setAttribute("height", String(height));
 svgElement.style.background = "transparent";

 const { jsPDF } = window.jspdf;
 const pdf = new jsPDF({
  orientation:"landscape",
  unit:"px",
  format:[width, height],
  compress:true
 });

 if(typeof pdf.svg !== "function"){
  throw new Error("A biblioteca de exportação PDF não carregou.");
 }

 await pdf.svg(svgElement, {
  x:0,
  y:0,
  width,
  height
 });

 return pdf.output("blob");
}

async function drawPreviewSvg(container){
 const font = fontMap.get(container.dataset.fontId);
 const text = getCurrentName();
 const item = container.closest(".item");
 const theme = item ? (item.dataset.bottleTheme || "preto") : "preto";
 const iconKey = item ? (item.dataset.iconKey || "") : "";
 const previewFill = getBottleTheme(theme).previewFill;

 if(!font){
  return;
 }

 container.innerHTML = await buildSvgMarkup(font, text, 1400, 180, previewFill, iconKey);
}

async function updateAll(){
 const items = Array.from(document.querySelectorAll(".preview-svg"));
 await Promise.all(items.map(drawPreviewSvg));
}

function scrollToSuggestions(){
 document.getElementById("suggestions").scrollIntoView({
  behavior:"smooth"
 });
}

function getCurrentName(){
 return document.getElementById("nameInput").value || "UltraCell";
}

async function ensureFontLoaded(font, size = 48){
 if(font.isLocal || !document.fonts || !document.fonts.load){
  return;
 }

 try{
  await document.fonts.load(`${size}px "${font.cssFamily}"`);
 }catch(error){
  console.error(error);
 }
}

async function isFontAvailable(font){
 if(font.isLocal){
  return !!(await getOpenTypeFont(font));
 }

 if(!document.fonts || !document.fonts.check){
  return true;
 }

 return document.fonts.check(`48px "${font.cssFamily}"`);
}

function getStatusText(font, available){
 if(available){
  return font.isLocal ? "arquivo carregado" : "carregada";
 }

 if(font.isLocal){
  return `não carregou: ${font.files.join(", ")}`;
 }

 return "verifique internet";
}

function downloadBlob(blob,filename){
 const url = URL.createObjectURL(blob);
 const a = document.createElement("a");
 a.href = url;
 a.download = filename;
 a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function isAppleMobile(){
 const ua = navigator.userAgent || "";
 const touchMac = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
 return /iPhone|iPad|iPod/i.test(ua) || touchMac;
}

function buildWhatsAppText(font, name, icon){
 const iconText = icon ? ` com ícone ${icon.label}` : "";
 return `Fonte escolhida: ${font.label} para o nome ${name}${iconText}. PDF vetorial em curvas, pronto para abrir no Corel.`;
}

function openWhatsAppWithMessage(text){
 window.open("https://wa.me/?text="+encodeURIComponent(text));
}

function buildShareFile(blob, fileName, mimeType){
 return new File([blob], fileName, { type:mimeType });
}

async function shareFileOnAppleMobile(file){
 if(!navigator.share){
  return { ok:false, reason:"unsupported" };
 }

 const shareData = { files:[file] };
 const canShareFiles = !navigator.canShare || navigator.canShare(shareData);

 if(!canShareFiles){
  return { ok:false, reason:"unsupported" };
 }

 try{
  await navigator.share(shareData);
  return { ok:true };
 }catch(error){
  const message = String((error && error.message) || "");
  const isAbort = error && (error.name === "AbortError" || /abort|cancel/i.test(message));

  if(isAbort){
   return { ok:false, reason:"cancelled" };
  }

  return { ok:false, reason:"failed", error };
 }
}

let noticeTimer = null;

function showNotice(message){
 const notice = document.getElementById("notice");
 if(!notice){
  return;
 }

 notice.textContent = message;
 notice.classList.add("show");

 if(noticeTimer){
  clearTimeout(noticeTimer);
 }

 noticeTimer = setTimeout(()=>{
  notice.classList.remove("show");
 }, 5000);
}

async function enviarWhats(control, fontId){
 try{
  const font = fontMap.get(fontId);
  if(!font){
   return;
  }

  const item = control && control.closest
   ? control.closest(".item")
   : document.querySelector(`.preview-svg[data-font-id="${fontId}"]`)?.closest(".item");
  const name = getCurrentName();
  const iconKey = item ? (item.dataset.iconKey || "") : "";
  const icon = getIconDefinition(iconKey);
  const pdfBlob = await buildOutlinedExportPdf(font, name, EXPORT_WIDTH, EXPORT_HEIGHT, iconKey);
  const fileName = `${name} - ${font.label}.pdf`;
  const pdfFile = buildShareFile(pdfBlob, fileName, "application/pdf");
  const text = buildWhatsAppText(font, name, icon);

  if(isAppleMobile()){
   const result = await shareFileOnAppleMobile(pdfFile);

   if(result.ok){
    return;
   }

   if(result.reason === "cancelled"){
    return;
   }

   downloadBlob(pdfBlob, fileName);
   showNotice("O iPhone não compartilhou o arquivo direto. O PDF foi baixado para anexar manualmente no WhatsApp.");
   return;
  }

  if(navigator.share){
   const shareData = {
    title:`${name} - ${font.label}`,
    text,
    files:[pdfFile]
   };

   const canShareFiles = !navigator.canShare || navigator.canShare(shareData);

   if(canShareFiles){
    try{
     await navigator.share(shareData);
     return;
    }catch(error){
     const message = String((error && error.message) || "");
     const isAbort = error && (error.name === "AbortError" || /abort|cancel/i.test(message));
     const isFileIssue = error && (error.name === "NotAllowedError" || error.name === "TypeError");

     if(isAbort){
      return;
     }

     if(isFileIssue){
      downloadBlob(pdfBlob, fileName);
      showNotice("O arquivo PDF foi baixado. Agora anexe no WhatsApp como documento.");
      openWhatsAppWithMessage(`${text} O PDF foi baixado para você anexar no WhatsApp.`);
      return;
     }

     throw error;
    }
   }
  }

  downloadBlob(pdfBlob, fileName);
  showNotice("O arquivo PDF foi baixado. Agora anexe no WhatsApp como documento.");
  openWhatsAppWithMessage(`${text} O PDF foi baixado para você anexar no WhatsApp.`);
 }catch(error){
  console.error(error);
  alert(error && error.message ? error.message : "Não foi possível preparar o PDF vetorial para compartilhamento no WhatsApp.");
 }
}

window.onload = async ()=>{
 mountLocalFontFaces();
 renderWatermark();
 create();

 await Promise.all(allFonts.map(font=>ensureFontLoaded(font)));

 await updateAll();
};

document.addEventListener("click", event=>{
 if(!event.target.closest(".picker-shell")){
  closePickerMenus();
 }
});

document.addEventListener("keydown", event=>{
 if(event.key === "Escape"){
  closePickerMenus();
 }
});

window.addEventListener("resize", ()=>{
 renderWatermark();
 updateAll();
});

