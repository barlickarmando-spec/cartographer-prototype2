#!/usr/bin/env node
/**
 * Script to add new cities from the user's spreadsheet data into:
 * 1. State_City_Data_Final.json (Tab B: rough_affordability_model_citie + Tab C: rough_housing_model)
 * 2. Typical_Home_Value.json
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const mainJsonPath = path.join(DATA_DIR, 'State_City_Data_Final.json');
const homeValuePath = path.join(DATA_DIR, 'Typical_Home_Value.json');

// State abbreviation to full name mapping
const STATE_ABBR_TO_FULL = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon',
  PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming'
};

function parseDollar(val) {
  if (val == null || val === '') return 0;
  const s = String(val).replace(/[$",\s]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// ============ NEW CITIES: Tab C (housing/COL) data ============
// Parsed from the first CSV the user provided
const newCitiesTabC = [
  { city: 'Moblie', state: 'AL', adjCOL: [32899,48024,48024,57532,75008,90603,59103,64744,72031,69214,84478,98652], rent2br: [14208,1014], rent1br: [12192,710], rent3br: [18180,1352], affCoeff: 0.86, prSqFt: 1.17 },
  { city: 'Tuscaloosa', state: 'AL', adjCOL: [34158,49523,49523,59171,77630,95099,61067,67166,74822,71423,87582,102936], rent2br: [13704,1004], rent1br: [11748,693], rent3br: [16236,1236], affCoeff: 0.88, prSqFt: 1.14 },
  { city: 'Flagstaff', state: 'AZ', adjCOL: [37419,55657,55657,67440,92173,113917,66807,73056,81690,80234,99905,119572], rent2br: [24396,944], rent1br: [20676,662], rent3br: [31968,1239], affCoeff: 0.46, prSqFt: 2.15 },
  { city: 'Bakersfield', state: 'CA', adjCOL: [36415,52292,52292,68059,92604,111683,64879,70631,79189,80997,100520,116087], rent2br: [17532,909], rent1br: [14664,641], rent3br: [22728,1203], affCoeff: 0.62, prSqFt: 1.61 },
  { city: 'Modesto', state: 'CA', adjCOL: [37283,54216,54216,71810,97770,117861,67821,73814,83185,84975,104857,122073], rent2br: [21384,901], rent1br: [17676,650], rent3br: [26664,1209], affCoeff: 0.51, prSqFt: 1.98 },
  { city: 'Monterrey', state: 'CA', adjCOL: [43351,59878,59878,84157,115032,139532,74918,81373,92350,95177,119656,142656], rent2br: [34956,902], rent1br: [26292,615], rent3br: [38616,1027], affCoeff: 0.31, prSqFt: 3.23 },
  { city: 'Sacramento', state: 'CA', adjCOL: [39163,56357,56357,77645,113369,143516,70613,76342,86580,90017,118040,146565], rent2br: [22452,911], rent1br: [18756,662], rent3br: [29028,1220], affCoeff: 0.49, prSqFt: 2.05 },
  { city: 'San Bernardino - Riverside', state: 'CA', adjCOL: [38380,54126,54126,72700,100482,122215,66805,72561,81947,85089,105642,125530], rent2br: [20232,849], rent1br: [15984,598], rent3br: [26400,1070], affCoeff: 0.50, prSqFt: 1.99 },
  { city: 'Santa Barbara', state: 'CA', adjCOL: [44759,60410,60410,90448,126019,150203,74060,80328,91986,98975,129508,153823], rent2br: [40824,819], rent1br: [27528,524], rent3br: [51660,1168], affCoeff: 0.24, prSqFt: 4.15 },
  { city: 'Santa Cruz', state: 'CA', adjCOL: [51056,65394,65394,104357,142435,171937,83003,90761,108576,113157,146820,176044], rent2br: [43704,843], rent1br: [32424,586], rent3br: [43140,811], affCoeff: 0.23, prSqFt: 4.32 },
  { city: 'Stockton', state: 'CA', adjCOL: [38618,55579,55579,74464,102465,123761,69129,75217,84695,87758,108884,127781], rent2br: [19908,907], rent1br: [15588,605], rent3br: [20904,1183], affCoeff: 0.55, prSqFt: 1.83 },
  { city: 'Ventura', state: 'CA', adjCOL: [41229,58529,58529,83479,124645,172229,72439,78925,90029,94270,128713,176507], rent2br: [34404,935], rent1br: [27672,676], rent3br: [40680,1192], affCoeff: 0.33, prSqFt: 3.07 },
  { city: 'Boulder', state: 'CO', adjCOL: [37625,55523,55523,87040,129936,155415,66320,73466,83664,97496,134947,159870], rent2br: [27588,948], rent1br: [21984,687], rent3br: [42660,1265], affCoeff: 0.41, prSqFt: 2.43 },
  { city: 'Fort Collins', state: 'CO', adjCOL: [37470,54476,54476,81622,118432,144168,64337,70709,81602,93102,123568,148161], rent2br: [21444,979], rent1br: [18432,703], rent3br: [24900,1190], affCoeff: 0.55, prSqFt: 1.83 },
  { city: 'Bridgeport', state: 'CT', adjCOL: [38846,57024,57024,94475,137952,172467,69203,76045,85672,104442,143043,177461], rent2br: [24096,855], rent1br: [20352,576], rent3br: [26580,1000], affCoeff: 0.43, prSqFt: 2.35 },
  { city: 'New Haven', state: 'CT', adjCOL: [36111,53275,53275,80478,115844,145421,64906,71019,80086,91831,121364,150031], rent2br: [28824,970], rent1br: [25020,673], rent3br: [31764,1191], affCoeff: 0.40, prSqFt: 2.48 },
  { city: 'Dover', state: 'DE', adjCOL: [33748,48844,48331,59713,79273,98154,59943,65409,73791,70485,87411,102507], rent2br: [20148,1009], rent1br: [17400,771], rent3br: [25980,1092], affCoeff: 0.60, prSqFt: 1.66 },
  { city: 'Cape Coral', state: 'FL', adjCOL: [32877,48420,48420,59736,79171,96251,59109,64535,72159,71004,87577,101601], rent2br: [20688,1040], rent1br: [18096,771], rent3br: [25536,1251], affCoeff: 0.60, prSqFt: 1.66 },
  { city: 'Daytona', state: 'FL', adjCOL: [30935,46315,46315,57563,76634,93542,56380,61696,69110,68686,85424,99364], rent2br: [18948,1029], rent1br: [15720,712], rent3br: [25176,1312], affCoeff: 0.65, prSqFt: 1.53 },
  { city: 'Gainesville', state: 'FL', adjCOL: [30957,47351,47351,59853,78491,94919,58264,63586,70413,70977,87516,101667], rent2br: [18300,1004], rent1br: [15096,681], rent3br: [21696,1316], affCoeff: 0.66, prSqFt: 1.52 },
  { city: 'Lakeland', state: 'FL', adjCOL: [31313,46328,46328,57026,74742,90721,56521,61742,68945,68043,83667,97249], rent2br: [18756,1090], rent1br: [15852,722], rent3br: [22392,1391], affCoeff: 0.70, prSqFt: 1.43 },
  { city: 'Ocala', state: 'FL', adjCOL: [30571,45474,45474,55760,73565,89557,55200,60381,67175,66721,82453,96491], rent2br: [18312,1111], rent1br: [14820,731], rent3br: [21996,1406], affCoeff: 0.73, prSqFt: 1.37 },
  { city: 'Pensacola', state: 'FL', adjCOL: [31894,48844,48844,61434,80484,97418,60332,65677,72867,72611,89303,103769], rent2br: [18444,1078], rent1br: [16092,735], rent3br: [22500,1403], affCoeff: 0.70, prSqFt: 1.43 },
  { city: 'Port St. Lucie', state: 'FL', adjCOL: [32422,48064,48064,61109,82074,98522,58784,64215,72031,72387,90457,103840], rent2br: [25176,1099], rent1br: [21672,777], rent3br: [29376,1388], affCoeff: 0.52, prSqFt: 1.91 },
  { city: 'Sarasota', state: 'FL', adjCOL: [31591,47531,47531,60242,82103,100553,57524,63014,70654,71574,90085,105657], rent2br: [25524,1081], rent1br: [21372,753], rent3br: [32748,1395], affCoeff: 0.51, prSqFt: 1.97 },
  { city: 'Tallahassee', state: 'FL', adjCOL: [31145,47754,47754,58774,76584,91737,58629,63854,70492,69782,85539,99017], rent2br: [17772,1087], rent1br: [14424,722], rent3br: [21072,1434], affCoeff: 0.73, prSqFt: 1.36 },
  { city: 'Vero Beach', state: 'FL', adjCOL: [31586,47084,47084,58376,77226,94166,57882,63413,70412,69776,86453,100705], rent2br: [23484,1050], rent1br: [21252,697], rent3br: [29772,1340], affCoeff: 0.54, prSqFt: 1.86 },
  { city: 'Athens', state: 'GA', adjCOL: [32871,47335,47335,56134,73778,87341,56762,62150,69619,67162,82550,94290], rent2br: [16716,1067], rent1br: [14076,719], rent3br: [19812,1346], affCoeff: 0.77, prSqFt: 1.31 },
  { city: 'Augusta', state: 'GA', adjCOL: [32427,47317,47234,57026,76026,91090,56533,61863,69124,68027,84618,97565], rent2br: [14748,1037], rent1br: [13248,706], rent3br: [19128,1316], affCoeff: 0.84, prSqFt: 1.19 },
  { city: 'Savannah', state: 'GA', adjCOL: [34562,49124,49124,55916,72302,86457,58555,64048,72217,67096,81059,92782], rent2br: [20064,1054], rent1br: [18204,747], rent3br: [23796,1368], affCoeff: 0.63, prSqFt: 1.59 },
  { city: 'Cedar Rapids', state: 'IA', adjCOL: [33703,49308,49308,58761,78621,96345,59752,65879,74069,70969,88308,103495], rent2br: [12636,925], rent1br: [9768,633], rent3br: [15876,1168], affCoeff: 0.88, prSqFt: 1.14 },
  { city: 'Fort Wayne', state: 'IN', adjCOL: [33796,49776,49776,68656,94636,116881,59854,65474,72549,80667,102579,122155], rent2br: [14916,1000], rent1br: [11904,684], rent3br: [18444,1297], affCoeff: 0.80, prSqFt: 1.24 },
  { city: 'South Bend', state: 'IN', adjCOL: [33578,50274,50274,68533,94812,116903,60107,65748,72902,80573,102440,122432], rent2br: [16764,955], rent1br: [14976,708], rent3br: [17904,1052], affCoeff: 0.68, prSqFt: 1.46 },
  { city: 'Champaign - Urbana', state: 'IL', adjCOL: [33421,49614,49614,68322,97142,110565,58856,64428,71807,80319,104659,115934], rent2br: [15084,969], rent1br: [12948,658], rent3br: [17688,1146], affCoeff: 0.77, prSqFt: 1.30 },
  { city: 'Bowling Green', state: 'KY', adjCOL: [32709,48162,47995,55131,72168,87757,57372,62837,69630,66543,81345,95657], rent2br: [13200,1016], rent1br: [10716,688], rent3br: [18144,1292], affCoeff: 0.92, prSqFt: 1.08 },
  { city: 'Lexington', state: 'KY', adjCOL: [31881,47579,47408,57381,77379,96607,56539,61936,69545,68684,86392,102674], rent2br: [16308,995], rent1br: [13008,685], rent3br: [20736,1325], affCoeff: 0.73, prSqFt: 1.37 },
  { city: 'Lafayette', state: 'LA', adjCOL: [31702,48533,48533,57962,76846,93092,58004,63501,70389,69525,86197,100988], rent2br: [14316,1000], rent1br: [11880,705], rent3br: [19692,1308], affCoeff: 0.84, prSqFt: 1.19 },
  { city: 'Shreveport', state: 'LA', adjCOL: [31381,48072,48072,57723,76530,93372,57350,62679,69710,69058,85717,100758], rent2br: [13056,976], rent1br: [10848,688], rent3br: [14976,1234], affCoeff: 0.90, prSqFt: 1.11 },
  { city: 'Amherst Town', state: 'MA', adjCOL: [38054,55700,55568,79401,110465,137557,68106,74304,83635,91858,117082,143147], rent2br: [17952,944], rent1br: [15984,703], rent3br: [24624,1335], affCoeff: 0.63, prSqFt: 1.58 },
  { city: 'Springfield', state: 'MA', adjCOL: [35344,51958,51826,74771,104599,129577,63400,68750,76838,87150,110754,134613], rent2br: [20412,792], rent1br: [15336,597], rent3br: [20952,894], affCoeff: 0.47, prSqFt: 2.15 },
  { city: 'Worcester', state: 'MA', adjCOL: [38039,54674,54542,83110,118936,146309,67039,72848,81932,94652,124787,151172], rent2br: [25632,924], rent1br: [21936,685], rent3br: [27444,1060], affCoeff: 0.43, prSqFt: 2.31 },
  { city: 'Ann Arbor', state: 'MI', adjCOL: [36157,53165,53165,68813,97579,121779,63256,69110,76757,81165,104630,126893], rent2br: [22920,983], rent1br: [20028,712], rent3br: [29448,1275], affCoeff: 0.51, prSqFt: 1.94 },
  { city: 'Grand Rapids', state: 'MI', adjCOL: [35878,52785,52785,63411,82886,101060,62763,68551,76437,75716,91915,107126], rent2br: [19584,994], rent1br: [16380,684], rent3br: [26376,1396], affCoeff: 0.61, prSqFt: 1.64 },
  { city: 'Lansing', state: 'MI', adjCOL: [33832,50214,50214,60825,79065,96128,59838,65293,72656,72675,88483,102927], rent2br: [14868,938], rent1br: [12144,656], rent3br: [18432,1220], affCoeff: 0.76, prSqFt: 1.32 },
  { city: 'Billings', state: 'MT', adjCOL: [36221,54201,52412,72034,100396,127156,65606,72089,81371,82349,104896,129184], rent2br: [18024,868], rent1br: [15144,531], rent3br: [24444,1421], affCoeff: 0.58, prSqFt: 1.73 },
  { city: 'Helena', state: 'MT', adjCOL: [36995,55777,53839,73108,101585,128495,67629,74360,84048,83667,105910,130668], rent2br: [20352,942], rent1br: [17652,522], rent3br: [19368,1044], affCoeff: 0.56, prSqFt: 1.80 },
  { city: 'Asheville', state: 'NC', adjCOL: [33422,50159,50159,60717,81922,100421,59917,65652,73201,72389,90611,106181], rent2br: [20244,1068], rent1br: [17328,781], rent3br: [23484,1308], affCoeff: 0.63, prSqFt: 1.58 },
  { city: 'Durham - Chapel Hill', state: 'NC', adjCOL: [33307,49466,49466,66683,90768,107362,59259,64796,72379,78058,97995,112273], rent2br: [19296,1057], rent1br: [16488,735], rent3br: [23100,1326], affCoeff: 0.66, prSqFt: 1.52 },
  { city: 'Fayetteville', state: 'NC', adjCOL: [31546,46656,46656,57173,74781,88506,55811,60927,68139,68047,83492,95562], rent2br: [15192,1051], rent1br: [13188,738], rent3br: [18852,1361], affCoeff: 0.83, prSqFt: 1.20 },
  { city: 'Willmington', state: 'NC', adjCOL: [33283,49946,49946,61272,80556,98599,59645,65374,73614,72949,89596,104353], rent2br: [19356,1064], rent1br: [16128,731], rent3br: [23280,1335], affCoeff: 0.66, prSqFt: 1.52 },
  { city: 'Winston Salem', state: 'NC', adjCOL: [31513,47142,47142,57934,76486,90571,56438,61695,68881,68998,85353,97618], rent2br: [14796,978], rent1br: [13272,703], rent3br: [18480,1230], affCoeff: 0.79, prSqFt: 1.26 },
  { city: 'Bismarck', state: 'ND', adjCOL: [33666,49313,49313,61894,84920,107564,59065,64989,72747,74043,93864,112438], rent2br: [15108,989], rent1br: [13392,710], rent3br: [20076,1348], affCoeff: 0.79, prSqFt: 1.27 },
  { city: 'Manchester', state: 'NH', adjCOL: [35981,52535,52535,72490,103360,129255,63582,69709,78001,84741,109467,134545], rent2br: [25356,979], rent1br: [21120,650], rent3br: [31332,1279], affCoeff: 0.46, prSqFt: 2.16 },
  { city: 'Trenton-Princeton', state: 'NJ', adjCOL: [36601,53730,53730,75557,111996,133842,65265,71750,80207,88317,118254,139393], rent2br: [22692,946], rent1br: [18720,723], rent3br: [19548,958], affCoeff: 0.50, prSqFt: 2.00 },
  { city: 'Santa Fe', state: 'NM', adjCOL: [35787,53192,53192,69718,100077,128832,62880,68947,77325,82475,106695,133842], rent2br: [22188,973], rent1br: [19932,698], rent3br: [26976,1222], affCoeff: 0.53, prSqFt: 1.90 },
  { city: 'Albany', state: 'NY', adjCOL: [36393,53891,53891,73270,106860,134704,63469,69351,77191,85290,112003,138222], rent2br: [21924,998], rent1br: [18540,705], rent3br: [23184,1289], affCoeff: 0.55, prSqFt: 1.83 },
  { city: 'Rochester', state: 'NY', adjCOL: [35280,52105,52105,70759,103085,129657,61565,67347,75022,82852,108593,133384], rent2br: [19128,1006], rent1br: [15924,720], rent3br: [27048,1510], affCoeff: 0.63, prSqFt: 1.58 },
  { city: 'Syracuse', state: 'NY', adjCOL: [35245,52412,52412,70630,101953,128000,61886,67677,75266,82808,107999,131834], rent2br: [17796,905], rent1br: [14760,634], rent3br: [25104,1098], affCoeff: 0.61, prSqFt: 1.64 },
  { city: 'Akron', state: 'OH', adjCOL: [32849,48979,48842,66840,95073,114509,58672,64554,71984,78971,102696,119796], rent2br: [13860,939], rent1br: [11448,635], rent3br: [16944,1301], affCoeff: 0.81, prSqFt: 1.23 },
  { city: 'Toledo', state: 'OH', adjCOL: [32198,47828,47660,64148,89448,107760,57121,62580,69655,75749,97584,113195], rent2br: [11916,905], rent1br: [9792,634], rent3br: [13884,1180], affCoeff: 0.91, prSqFt: 1.10 },
  { city: 'Eugene', state: 'OR', adjCOL: [37893,55554,55554,79213,112335,132626,66869,73329,83432,91736,118264,137611], rent2br: [20016,964], rent1br: [17148,669], rent3br: [25044,1225], affCoeff: 0.58, prSqFt: 1.73 },
  { city: 'Salem', state: 'OR', adjCOL: [37799,55104,55104,72184,99786,118901,66339,72785,82582,85395,107170,124409], rent2br: [16776,916], rent1br: [14448,658], rent3br: [22392,1168], affCoeff: 0.66, prSqFt: 1.53 },
  { city: 'Allentown', state: 'PA', adjCOL: [35448,53094,53094,72898,104534,133044,63729,69803,78097,85559,111156,138339], rent2br: [21708,988], rent1br: [17508,698], rent3br: [27612,1310], affCoeff: 0.55, prSqFt: 1.83 },
  { city: 'Lancaster', state: 'PA', adjCOL: [36222,54175,54175,73965,104964,134450,65217,71403,79759,86792,111929,139909], rent2br: [20808,1083], rent1br: [17856,749], rent3br: [24300,1388], affCoeff: 0.62, prSqFt: 1.60 },
  { city: 'Scranton', state: 'PA', adjCOL: [34304,51699,51699,65559,88935,112149,61833,67657,75400,77916,97859,117914], rent2br: [18264,968], rent1br: [15708,770], rent3br: [15252,1232], affCoeff: 0.64, prSqFt: 1.57 },
  { city: 'Columbia', state: 'SC', adjCOL: [32263,47985,47725,59967,81817,100397,57082,62346,69473,70895,90081,105818], rent2br: [16248,1068], rent1br: [13884,741], rent3br: [19728,1332], affCoeff: 0.79, prSqFt: 1.27 },
  { city: 'Myrtle Beach', state: 'SC', adjCOL: [33062,48606,48336,61738,84770,103743,58236,63573,70790,72743,92566,108444], rent2br: [18732,1047], rent1br: [16164,724], rent3br: [21972,1328], affCoeff: 0.67, prSqFt: 1.49 },
  { city: 'Sioux Falls', state: 'SD', adjCOL: [32672,49474,49474,59984,80634,100702,59040,64933,72596,72078,90183,107375], rent2br: [14244,998], rent1br: [11688,713], rent3br: [18024,1278], affCoeff: 0.84, prSqFt: 1.19 },
  { city: 'Chattanooga', state: 'TN', adjCOL: [32308,47402,47402,56238,74080,86841,57335,62832,69857,67559,83225,94391], rent2br: [17472,1095], rent1br: [14976,737], rent3br: [21312,1419], affCoeff: 0.75, prSqFt: 1.33 },
  { city: 'Corpus Christi', state: 'TX', adjCOL: [29500,44288,44288,53196,70251,85896,53024,57765,64225,63613,78651,92739], rent2br: [14820,973], rent1br: [12048,690], rent3br: [18216,1235], affCoeff: 0.79, prSqFt: 1.27 },
  { city: 'Lubbock', state: 'TX', adjCOL: [28828,44071,44071,52212,69040,84198,52514,57352,64036,62778,77608,91665], rent2br: [12168,970], rent1br: [10176,667], rent3br: [15648,1278], affCoeff: 0.96, prSqFt: 1.05 },
  { city: 'McAllen', state: 'TX', adjCOL: [28128,42295,42295,50540,66792,80117,50210,53885,60647,60542,74838,87933], rent2br: [11892,930], rent1br: [9924,700], rent3br: [16524,1049], affCoeff: 0.94, prSqFt: 1.07 },
  { city: 'Tyler', state: 'TX', adjCOL: [31021,46801,46801,54127,69940,84522,56314,61473,68392,65085,78788,92082], rent2br: [15132,1006], rent1br: [12228,681], rent3br: [18636,1328], affCoeff: 0.80, prSqFt: 1.25 },
  { city: 'Waco', state: 'TX', adjCOL: [28938,43709,43709,51290,67256,80910,52261,56984,63215,61700,75645,88645], rent2br: [15420,964], rent1br: [12372,664], rent3br: [17964,1179], affCoeff: 0.75, prSqFt: 1.33 },
  { city: 'Charlottesville', state: 'VA', adjCOL: [35370,51468,51125,66218,93227,117137,61452,67411,75445,77504,99581,121154], rent2br: [23640,1038], rent1br: [20700,733], rent3br: [27048,1257], affCoeff: 0.53, prSqFt: 1.90 },
  { city: 'Richmond', state: 'VA', adjCOL: [34595,50011,49669,63534,88037,109523,59471,65157,73021,74464,95025,113635], rent2br: [19344,958], rent1br: [16968,686], rent3br: [24084,1252], affCoeff: 0.59, prSqFt: 1.68 },
  { city: 'Burlington', state: 'VT', adjCOL: [37970,56164,56164,86732,131801,165075,65959,72463,81691,97113,136617,170157], rent2br: [20184,1025], rent1br: [25560,645], rent3br: [17688,1484], affCoeff: 0.61, prSqFt: 1.64 },
  { city: 'Spokane', state: 'WA', adjCOL: [33120,49900,49900,66065,93244,118833,61381,67247,75312,78267,101015,124137], rent2br: [16968,974], rent1br: [13752,643], rent3br: [21672,1286], affCoeff: 0.69, prSqFt: 1.45 },
  { city: 'Green Bay', state: 'WI', adjCOL: [34039,49865,49231,68201,98714,123263,60702,66914,75237,79632,105412,127701], rent2br: [15000,1007], rent1br: [11844,735], rent3br: [19692,1356], affCoeff: 0.81, prSqFt: 1.24 },
];

// ============ NEW HOME VALUES from second CSV ============
const newHomeValues = {
  // New cities only (states already exist in existing file)
  'Moblie': { pricePerSqft: 150, avgHomePrice: 330000 },
  'Tuscaloosa': { pricePerSqft: 223, avgHomePrice: 490600 },
  'Flagstaff': { pricePerSqft: 420, avgHomePrice: 924000 },
  'Bakersfield': { pricePerSqft: 239, avgHomePrice: 525800 },
  'Modesto': { pricePerSqft: 270, avgHomePrice: 594000 },
  'Monterrey': { pricePerSqft: 900, avgHomePrice: 1980000 },
  'Sacramento': { pricePerSqft: 420, avgHomePrice: 924000 },
  'San Bernardino - Riverside': { pricePerSqft: 350, avgHomePrice: 770000 },
  'Santa Barbara': { pricePerSqft: 950, avgHomePrice: 2090000 },
  'Santa Cruz': { pricePerSqft: 886, avgHomePrice: 1949200 },
  'Stockton': { pricePerSqft: 322, avgHomePrice: 708400 },
  'Ventura': { pricePerSqft: 650, avgHomePrice: 1430000 },
  'Boulder': { pricePerSqft: 640, avgHomePrice: 1408000 },
  'Fort Collins': { pricePerSqft: 330, avgHomePrice: 726000 },
  'Bridgeport': { pricePerSqft: 290, avgHomePrice: 638000 },
  'New Haven': { pricePerSqft: 260, avgHomePrice: 572000 },
  'Dover': { pricePerSqft: 220, avgHomePrice: 484000 },
  'Cape Coral': { pricePerSqft: 270, avgHomePrice: 594000 },
  'Daytona': { pricePerSqft: 240, avgHomePrice: 528000 },
  'Gainesville': { pricePerSqft: 230, avgHomePrice: 506000 },
  'Lakeland': { pricePerSqft: 210, avgHomePrice: 462000 },
  'Ocala': { pricePerSqft: 200, avgHomePrice: 440000 },
  'Pensacola': { pricePerSqft: 210, avgHomePrice: 462000 },
  'Port St. Lucie': { pricePerSqft: 280, avgHomePrice: 616000 },
  'Sarasota': { pricePerSqft: 350, avgHomePrice: 770000 },
  'Tallahassee': { pricePerSqft: 220, avgHomePrice: 484000 },
  'Vero Beach': { pricePerSqft: 330, avgHomePrice: 726000 },
  'Athens': { pricePerSqft: 220, avgHomePrice: 484000 },
  'Augusta': { pricePerSqft: 162, avgHomePrice: 356400 },
  'Savannah': { pricePerSqft: 240, avgHomePrice: 528000 },
  'Cedar Rapids': { pricePerSqft: 160, avgHomePrice: 352000 },
  'Fort Wayne': { pricePerSqft: 150, avgHomePrice: 330000 },
  'South Bend': { pricePerSqft: 145, avgHomePrice: 319000 },
  'Champaign - Urbana': { pricePerSqft: 190, avgHomePrice: 418000 },
  'Bowling Green': { pricePerSqft: 190, avgHomePrice: 418000 },
  'Lexington': { pricePerSqft: 210, avgHomePrice: 462000 },
  'Lafayette': { pricePerSqft: 150, avgHomePrice: 330000 },
  'Shreveport': { pricePerSqft: 127, avgHomePrice: 279400 },
  'Amherst Town': { pricePerSqft: 325, avgHomePrice: 715000 },
  'Springfield': { pricePerSqft: 260, avgHomePrice: 572000 },
  'Worcester': { pricePerSqft: 285, avgHomePrice: 627000 },
  'Ann Arbor': { pricePerSqft: 345, avgHomePrice: 759000 },
  'Grand Rapids': { pricePerSqft: 220, avgHomePrice: 484000 },
  'Lansing': { pricePerSqft: 205, avgHomePrice: 451000 },
  'Billings': { pricePerSqft: 240, avgHomePrice: 528000 },
  'Helena': { pricePerSqft: 260, avgHomePrice: 572000 },
  'Asheville': { pricePerSqft: 330, avgHomePrice: 726000 },
  'Durham - Chapel Hill': { pricePerSqft: 260, avgHomePrice: 572000 },
  'Fayetteville': { pricePerSqft: 180, avgHomePrice: 396000 },
  'Willmington': { pricePerSqft: 240, avgHomePrice: 528000 },
  'Winston Salem': { pricePerSqft: 195, avgHomePrice: 429000 },
  'Bismarck': { pricePerSqft: 210, avgHomePrice: 462000 },
  'Manchester': { pricePerSqft: 300, avgHomePrice: 660000 },
  'Trenton-Princeton': { pricePerSqft: 340, avgHomePrice: 748000 },
  'Santa Fe': { pricePerSqft: 420, avgHomePrice: 924000 },
  'Albany': { pricePerSqft: 220, avgHomePrice: 484000 },
  'Rochester': { pricePerSqft: 180, avgHomePrice: 396000 },
  'Syracuse': { pricePerSqft: 170, avgHomePrice: 374000 },
  'Akron': { pricePerSqft: 150, avgHomePrice: 330000 },
  'Toledo': { pricePerSqft: 140, avgHomePrice: 308000 },
  'Eugene': { pricePerSqft: 300, avgHomePrice: 660000 },
  'Salem': { pricePerSqft: 275, avgHomePrice: 605000 },
  'Allentown': { pricePerSqft: 210, avgHomePrice: 462000 },
  'Lancaster': { pricePerSqft: 230, avgHomePrice: 506000 },
  'Scranton': { pricePerSqft: 180, avgHomePrice: 396000 },
  'Columbia': { pricePerSqft: 220, avgHomePrice: 484000 },
  'Myrtle Beach': { pricePerSqft: 290, avgHomePrice: 638000 },
  'Sioux Falls': { pricePerSqft: 280, avgHomePrice: 616000 },
  'Chattanooga': { pricePerSqft: 250, avgHomePrice: 550000 },
  'Corpus Christi': { pricePerSqft: 200, avgHomePrice: 440000 },
  'Lubbock': { pricePerSqft: 170, avgHomePrice: 374000 },
  'McAllen': { pricePerSqft: 165, avgHomePrice: 363000 },
  'Tyler': { pricePerSqft: 185, avgHomePrice: 407000 },
  'Waco': { pricePerSqft: 190, avgHomePrice: 418000 },
  'Charlottesville': { pricePerSqft: 420, avgHomePrice: 924000 },
  'Richmond': { pricePerSqft: 240, avgHomePrice: 528000 },
  'Burlington': { pricePerSqft: 400, avgHomePrice: 880000 },
  'Spokane': { pricePerSqft: 280, avgHomePrice: 616000 },
  'Green Bay': { pricePerSqft: 190, avgHomePrice: 418000 },
};

// ============ MAIN SCRIPT ============
const mainData = JSON.parse(fs.readFileSync(mainJsonPath, 'utf8'));
const homeValueData = JSON.parse(fs.readFileSync(homeValuePath, 'utf8'));

// Get existing city names in Tab B and Tab C for dedup
const existingTabB = new Set(mainData.rough_affordability_model_citie.map(c =>
  (c['City/County'] || '').trim().toLowerCase()
));
const existingTabC = new Set(mainData.rough_housing_model
  .filter(r => r.Classification === 'City')
  .map(c => (c['City/State'] || '').trim().toLowerCase())
);

// NOTE: Fort Wayne and South Bend are labeled as ID in the CSV but are actually IN (Indiana)
// Fix state code mapping issues from the original spreadsheet
const STATE_FIXES = {
  'Fort Wayne': 'IN',
  'South Bend': 'IN',
};

let addedTabB = 0, addedTabC = 0, addedHomeVal = 0;

for (const city of newCitiesTabC) {
  const cityName = city.city.trim();
  const stateCode = STATE_FIXES[cityName] || city.state;
  const fullStateName = STATE_ABBR_TO_FULL[stateCode];

  // ---- Add to Tab C (rough_housing_model) ----
  if (!existingTabC.has(cityName.toLowerCase())) {
    const tabCRow = {
      'City/State': cityName,
      'Classification': 'City',
      'State': stateCode,
      'Population': null,
      // Adjusted COL fields
      'Adjusted Cost of Living (1 Person)': city.adjCOL[0],
      'Adjusted Cost of Living (1 Worker + 1 Adult)': city.adjCOL[1],
      'Adjusted Cost of Living (2 earners)': city.adjCOL[2],
      'Adjusted Cost of Living (Single Parent 1 Kid)': city.adjCOL[3],
      'Adjusted Cost of Living (Single Parent 2 Kids)': city.adjCOL[4],
      'Adjusted Cost of Living (Single Parent 3 Kids)': city.adjCOL[5],
      'Adjusted Cost of Living (Family of 3, 1 Worker)': city.adjCOL[6],
      'Adjusted Cost of Living (Family of 4, 1 Worker)': city.adjCOL[7],
      'Adjusted Cost of Living (Family of 5, 1 Worker)': city.adjCOL[8],
      'Adjusted Cost of Living (Family of 3, 2 Workers)': city.adjCOL[9],
      'Adjusted Cost of Living (Family of 4, 2 Workers)': city.adjCOL[10],
      'Adjusted Cost of Living (Family of 5, 2 Workers)': city.adjCOL[11],
      // 2BR rent
      'Average Annual Rent': city.rent2br[0],
      'Corresponding Apartment Size (Sq Ft.)': city.rent2br[1],
      'Affordability Coefficient': city.affCoeff,
      'Price Per Sq Ft.': city.prSqFt,
      // 1BR rent
      'Average Annual Rent (Single)': city.rent1br[0],
      'Corresponding Apartment Size (Sq Ft.).1': city.rent1br[1],
      // 3BR rent
      'Average Annual Rent (Three Bedroom)': city.rent3br[0],
      'Corresponding Apartment Size (Sq Ft.).2': city.rent3br[1],
    };
    mainData.rough_housing_model.push(tabCRow);
    addedTabC++;
    console.log(`Tab C: Added ${cityName}, ${stateCode}`);
  } else {
    console.log(`Tab C: SKIP (exists) ${cityName}`);
  }

  // ---- Add to Tab B (rough_affordability_model_citie) ----
  if (!existingTabB.has(cityName.toLowerCase())) {
    // Find parent state data from Tab A for salary info
    const stateRow = mainData.rough_affordability_model.find(s =>
      s.State && s.State.toLowerCase() === (fullStateName || '').toLowerCase()
    );

    if (!stateRow) {
      console.log(`Tab B: SKIP (no parent state ${fullStateName}) ${cityName}`);
      continue;
    }

    // Use home value from the newHomeValues data
    const hv = newHomeValues[cityName];
    const homePrice = hv ? hv.avgHomePrice : (stateRow['Typical Home Value (Single Family Normal)'] || 300000);

    // Use parent state's mortgage rate and down payment
    const mortgageRate = stateRow['Average Mortgage Rate (Fixed 30 Year)'] || 0.065;
    const downPaymentPct = stateRow['Median Mortgage Down Payment %'] || 0.107;
    const principal = homePrice * (1 - downPaymentPct);
    const monthlyRate = mortgageRate / 12;
    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, 360)) / (Math.pow(1 + monthlyRate, 360) - 1);
    const annualPayment = monthlyPayment * 12;

    const tabBRow = {
      'City/County': cityName,
      'State': stateCode,
      'Population': null,
      // Salaries from parent state
      'Management': stateRow['Management'] || 0,
      'Business and Operations': stateRow['Business and Operations'] || 0,
      'Computer and Mathematics': stateRow['Computer and Mathematics'] || 0,
      'Architecture and Engineering': stateRow['Architecture and Engineering'] || 0,
      'Life, Physical, and Social Science': stateRow['Life, Physical, and Social Science'] || 0,
      'Community Service': stateRow['Community Service'] || 0,
      'Legal Work': stateRow['Legal Work'] || 0,
      'Education, Training, Library': stateRow['Education, Training, Library'] || 0,
      'Arts, Design, Entertainment, Sports, Media': stateRow['Arts, Design, Entertainment, Sports, Media'] || 0,
      'Healthcare Practioners and Technical Work': stateRow['Healthcare Practioners and Technical Work'] || 0,
      'Healthcare Support': stateRow['Healthcare Support'] || 0,
      'Protective Service': stateRow['Protective Service'] || 0,
      'Food Preparation and Serving': stateRow['Food Preparation and Serving'] || 0,
      'Cleaning and Maintenance': stateRow['Cleaning and Maintenance'] || 0,
      'Personal Care and Service': stateRow['Personal Care and Service'] || 0,
      'Sales and Related': stateRow['Sales and Related'] || 0,
      'Office and Administrative Support': stateRow['Office and Administrative Support'] || 0,
      'Farming, Fishing, and Forestry': stateRow['Farming, Fishing, and Forestry'] || 0,
      'Construction and Extraction': stateRow['Construction and Extraction'] || 0,
      'Insallation, Maintenance, and Repair': stateRow['Insallation, Maintenance, and Repair'] || 0,
      'Production': stateRow['Production'] || 0,
      'Transportation and Material Moving': stateRow['Transportation and Material Moving'] || 0,
      'Overall Average': stateRow['Overall Average'] || 0,
      // Housing data
      'Typical Home Value (Single Family)': homePrice,
      'Typical Home Value (Small)': hv ? Math.round(hv.pricePerSqft * 1500) : null,
      'Typical Home Value (Large)': hv ? Math.round(hv.pricePerSqft * 3000) : null,
      'Typical Home Value (Very Large)': hv ? Math.round(hv.pricePerSqft * 5000) : null,
      'Principal Value': Math.round(principal),
      'Average Mortgage Rate (Fixed 30 Year)': mortgageRate,
      'Monthly Mortgage Payment': Math.round(monthlyPayment * 100) / 100,
      'Median Annual Interest Payment': Math.round((annualPayment - (principal / 30)) * 100) / 100,
      'Median Total Interest Paid (30 years)': null,
      'Median Total Post Mortgage Housing Costs': null,
      'Median Monthly Overall Payment': null,
      'Verification Table': null,
      'Median Overall Annual Payment': Math.round(annualPayment * 100) / 100,
      'Median Mortgage Down Payment %': downPaymentPct,
      'Median Mortgage Down Payment Total Value': Math.round(homePrice * downPaymentPct),
      // Credit card from parent state
      'Average Credit Card Debt': stateRow['Average Credit Card Debt'] || 0,
      'Average Annual APR': stateRow['Average Annual APR'] || 0.216,
      // Appreciation from parent state
      '% Change in Median Home Value by State (5 Years)': stateRow['% Change in Median Home Value by State (5 Years)'] || 0,
    };

    mainData.rough_affordability_model_citie.push(tabBRow);
    addedTabB++;
    console.log(`Tab B: Added ${cityName}, ${stateCode} (salaries from ${fullStateName})`);
  } else {
    console.log(`Tab B: SKIP (exists) ${cityName}`);
  }
}

// ---- Update Typical_Home_Value.json ----
for (const [name, vals] of Object.entries(newHomeValues)) {
  if (!homeValueData[name]) {
    homeValueData[name] = vals;
    addedHomeVal++;
  }
}

// Also add states from the second CSV that might be missing
const stateHomeValues = {
  'Alabama': { pricePerSqft: 165, avgHomePrice: 363000 },
  'Alaska': { pricePerSqft: 260, avgHomePrice: 572000 },
  'Arizona': { pricePerSqft: 164, avgHomePrice: 360800 },
  'Arkansas': { pricePerSqft: 160, avgHomePrice: 352000 },
  'California': { pricePerSqft: 439, avgHomePrice: 965800 },
  'Colorado': { pricePerSqft: 280, avgHomePrice: 616000 },
  'Connecticut': { pricePerSqft: 276, avgHomePrice: 607200 },
  'Delaware': { pricePerSqft: 234, avgHomePrice: 514800 },
  'District of Columbia': { pricePerSqft: 479, avgHomePrice: 1053800 },
  'Florida': { pricePerSqft: 261, avgHomePrice: 574200 },
  'Georgia': { pricePerSqft: 187, avgHomePrice: 411400 },
  'Hawaii': { pricePerSqft: 745, avgHomePrice: 1639000 },
  'Idaho': { pricePerSqft: 170, avgHomePrice: 374000 },
  'Illinois': { pricePerSqft: 174, avgHomePrice: 382800 },
  'Indiana': { pricePerSqft: 159, avgHomePrice: 349800 },
  'Iowa': { pricePerSqft: 170, avgHomePrice: 374000 },
  'Kansas': { pricePerSqft: 154, avgHomePrice: 338800 },
  'Kentucky': { pricePerSqft: 173, avgHomePrice: 380600 },
  'Louisiana': { pricePerSqft: 151, avgHomePrice: 332200 },
  'Maine': { pricePerSqft: 272, avgHomePrice: 598400 },
  'Maryland': { pricePerSqft: 229, avgHomePrice: 503800 },
  'Massachusetts': { pricePerSqft: 411, avgHomePrice: 904200 },
  'Michigan': { pricePerSqft: 175, avgHomePrice: 385000 },
  'Minnesota': { pricePerSqft: 198, avgHomePrice: 435600 },
  'Mississippi': { pricePerSqft: 148, avgHomePrice: 325600 },
  'Missouri': { pricePerSqft: 170, avgHomePrice: 374000 },
  'Montana': { pricePerSqft: 316, avgHomePrice: 695200 },
  'Nebraska': { pricePerSqft: 169, avgHomePrice: 371800 },
  'Nevada': { pricePerSqft: 268, avgHomePrice: 589600 },
  'New Hampshire': { pricePerSqft: 308, avgHomePrice: 677600 },
  'New Jersey': { pricePerSqft: 301, avgHomePrice: 662200 },
  'New Mexico': { pricePerSqft: 208, avgHomePrice: 457600 },
  'New York': { pricePerSqft: 413, avgHomePrice: 908600 },
  'North Carolina': { pricePerSqft: 212, avgHomePrice: 466400 },
  'North Dakota': { pricePerSqft: 173, avgHomePrice: 380600 },
  'Ohio': { pricePerSqft: 162, avgHomePrice: 356400 },
  'Oklahoma': { pricePerSqft: 160, avgHomePrice: 352000 },
  'Oregon': { pricePerSqft: 301, avgHomePrice: 662200 },
  'Pennsylvania': { pricePerSqft: 187, avgHomePrice: 411400 },
  'Rhode Island': { pricePerSqft: 370, avgHomePrice: 814000 },
  'South Carolina': { pricePerSqft: 195, avgHomePrice: 429000 },
  'South Dakota': { pricePerSqft: 206, avgHomePrice: 453200 },
  'Tennessee': { pricePerSqft: 219, avgHomePrice: 481800 },
  'Texas': { pricePerSqft: 180, avgHomePrice: 396000 },
  'Utah': { pricePerSqft: 256, avgHomePrice: 563200 },
  'Vermont': { pricePerSqft: 268, avgHomePrice: 589600 },
  'Virginia': { pricePerSqft: 228, avgHomePrice: 501600 },
  'Washington': { pricePerSqft: 327, avgHomePrice: 719400 },
  'West Virginia': { pricePerSqft: 139, avgHomePrice: 305800 },
  'Wisconsin': { pricePerSqft: 210, avgHomePrice: 462000 },
  'Wyoming': { pricePerSqft: 203, avgHomePrice: 446600 },
};

for (const [name, vals] of Object.entries(stateHomeValues)) {
  if (!homeValueData[name]) {
    homeValueData[name] = vals;
    addedHomeVal++;
  } else {
    // Update existing entries with fresh data
    homeValueData[name] = vals;
  }
}

// Also add existing cities from second CSV that were already in system
const existingCityHomeValues = {
  'Albuquerque': { pricePerSqft: 218, avgHomePrice: 479600 },
  'Anaheim': { pricePerSqft: 655, avgHomePrice: 1441000 },
  'Anchorage': { pricePerSqft: 265, avgHomePrice: 583000 },
  'Atlanta': { pricePerSqft: 194, avgHomePrice: 426800 },
  'Austin': { pricePerSqft: 236, avgHomePrice: 519200 },
  'Baltimore': { pricePerSqft: 214, avgHomePrice: 470800 },
  'Baton Rouge': { pricePerSqft: 164, avgHomePrice: 360800 },
  'Birmingham': { pricePerSqft: 156, avgHomePrice: 343200 },
  'Boise': { pricePerSqft: 295, avgHomePrice: 649000 },
  'Boston': { pricePerSqft: 461, avgHomePrice: 1014200 },
  'Buffalo': { pricePerSqft: 141, avgHomePrice: 310200 },
  'Charleston': { pricePerSqft: 234, avgHomePrice: 514800 },
  'Charlotte': { pricePerSqft: 217, avgHomePrice: 477400 },
  'Chicago': { pricePerSqft: 207, avgHomePrice: 455400 },
  'Cincinnati': { pricePerSqft: 190, avgHomePrice: 418000 },
  'Cleveland': { pricePerSqft: 151, avgHomePrice: 332200 },
  'Colorado Springs': { pricePerSqft: 231, avgHomePrice: 508200 },
  'Columbus': { pricePerSqft: 176, avgHomePrice: 387200 },
  'Dallas-Fort Worth': { pricePerSqft: 185, avgHomePrice: 407000 },
  'Denver': { pricePerSqft: 259, avgHomePrice: 569800 },
  'Des Moines': { pricePerSqft: 228, avgHomePrice: 501600 },
  'Detroit': { pricePerSqft: 169, avgHomePrice: 371800 },
  'Fort Lauderdale': { pricePerSqft: 362, avgHomePrice: 796400 },
  'Fresno': { pricePerSqft: 259, avgHomePrice: 569800 },
  'Hartford': { pricePerSqft: 257, avgHomePrice: 565400 },
  'Honolulu': { pricePerSqft: 708, avgHomePrice: 1557600 },
  'Houston': { pricePerSqft: 174, avgHomePrice: 382800 },
  'Huntsville': { pricePerSqft: 171, avgHomePrice: 376200 },
  'Indianapolis': { pricePerSqft: 166, avgHomePrice: 365200 },
  'Jackson ': { pricePerSqft: 153, avgHomePrice: 336600 },
  'Jacksonville': { pricePerSqft: 213, avgHomePrice: 468600 },
  'Jersey City/Newark': { pricePerSqft: 524, avgHomePrice: 1152800 },
  'Kansas City': { pricePerSqft: 197, avgHomePrice: 433400 },
  'Knoxville': { pricePerSqft: 231, avgHomePrice: 508200 },
  'Las Vegas': { pricePerSqft: 263, avgHomePrice: 578600 },
  'Lincoln': { pricePerSqft: 180, avgHomePrice: 396000 },
  'Little Rock': { pricePerSqft: 155, avgHomePrice: 341000 },
  'Los Angeles': { pricePerSqft: 655, avgHomePrice: 1441000 },
  'Louisville': { pricePerSqft: 180, avgHomePrice: 396000 },
  'Madison': { pricePerSqft: 244, avgHomePrice: 536800 },
  'Memphis': { pricePerSqft: 153, avgHomePrice: 336600 },
  'Miami-Dade': { pricePerSqft: 362, avgHomePrice: 796400 },
  'Milwaukee': { pricePerSqft: 223, avgHomePrice: 490600 },
  'Minneapolis/St. Paul': { pricePerSqft: 210, avgHomePrice: 462000 },
  'Montgomery': { pricePerSqft: 128, avgHomePrice: 281600 },
  'Nashville': { pricePerSqft: 260, avgHomePrice: 572000 },
  'New Orleans': { pricePerSqft: 179, avgHomePrice: 393800 },
  'New York City': { pricePerSqft: 524, avgHomePrice: 1152800 },
  'Oklahoma City': { pricePerSqft: 171, avgHomePrice: 376200 },
  'Omaha': { pricePerSqft: 182, avgHomePrice: 400400 },
  'Orlando': { pricePerSqft: 226, avgHomePrice: 497200 },
  'Philadelphia': { pricePerSqft: 226, avgHomePrice: 497200 },
  'Phoenix': { pricePerSqft: 270, avgHomePrice: 594000 },
  'Pittsburgh': { pricePerSqft: 164, avgHomePrice: 360800 },
  'Portland': { pricePerSqft: 311, avgHomePrice: 684200 },
  'Providence': { pricePerSqft: 357, avgHomePrice: 785400 },
  'Raleigh': { pricePerSqft: 217, avgHomePrice: 477400 },
  'Reno': { pricePerSqft: 330, avgHomePrice: 726000 },
  'Salt Lake City': { pricePerSqft: 260, avgHomePrice: 572000 },
  'San Antonio': { pricePerSqft: 172, avgHomePrice: 378400 },
  'San Diego': { pricePerSqft: 599, avgHomePrice: 1317800 },
  'San Francisco': { pricePerSqft: 609, avgHomePrice: 1339800 },
  'San Jose': { pricePerSqft: 783, avgHomePrice: 1722600 },
  'Seattle': { pricePerSqft: 428, avgHomePrice: 941600 },
  'St. Louis': { pricePerSqft: 166, avgHomePrice: 365200 },
  'Tampa': { pricePerSqft: 243, avgHomePrice: 534600 },
  'Tucson': { pricePerSqft: 228, avgHomePrice: 501600 },
  'Tulsa': { pricePerSqft: 163, avgHomePrice: 358600 },
  'Virginia Beach': { pricePerSqft: 218, avgHomePrice: 479600 },
  'Wichita': { pricePerSqft: 144, avgHomePrice: 316800 },
};

for (const [name, vals] of Object.entries(existingCityHomeValues)) {
  homeValueData[name] = vals; // Always update to latest values
}

// Write updated files
fs.writeFileSync(mainJsonPath, JSON.stringify(mainData, null, 2));
fs.writeFileSync(homeValuePath, JSON.stringify(homeValueData, null, 2));

console.log(`\n=== SUMMARY ===`);
console.log(`Tab B (city salaries): ${addedTabB} new cities added`);
console.log(`Tab C (city COL/rent): ${addedTabC} new cities added`);
console.log(`Typical_Home_Value.json: ${addedHomeVal} new entries added`);
console.log(`Total cities in Tab B: ${mainData.rough_affordability_model_citie.length}`);
console.log(`Total rows in Tab C: ${mainData.rough_housing_model.length}`);
console.log(`Total entries in home values: ${Object.keys(homeValueData).length}`);
