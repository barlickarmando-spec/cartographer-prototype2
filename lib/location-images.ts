/**
 * Location image data for hero carousels on location detail pages.
 * Maps location names to arrays of image objects.
 *
 * To add images for a new location:
 * 1. Add images to /public/location-images/{LocationName}/
 * 2. Add an entry here with the location name as key
 */

export interface LocationImage {
  src: string;
  alt: string;
}

const LOCATION_IMAGES: Record<string, LocationImage[]> = {
  'Alabama': [
    { src: '/location-images/Alabama/Alabama.jpg', alt: 'Alabama scenic view' },
    { src: '/location-images/Alabama/Alabama 2.jpg', alt: 'Alabama landscape' },
    { src: '/location-images/Alabama/Alabama 3.jpg', alt: 'Alabama cityscape' },
  ],
  'Alaska': [
    { src: '/location-images/Alaska/Alaska.jpg', alt: 'Alaska scenic view' },
    { src: '/location-images/Alaska/Alaska 2.jpg', alt: 'Alaska landscape' },
    { src: '/location-images/Alaska/alaska 3.jpg', alt: 'Alaska wilderness' },
    { src: '/location-images/Alaska/Alaska 4.jpg', alt: 'Alaska mountains' },
  ],
  'Arizona': [
    { src: '/location-images/Arizona/Arizona.jpg', alt: 'Arizona scenic view' },
    { src: '/location-images/Arizona/Arizona 2.jpg', alt: 'Arizona landscape' },
    { src: '/location-images/Arizona/Arizona 3.jpg', alt: 'Arizona desert' },
    { src: '/location-images/Arizona/Arizona 4.jpg', alt: 'Arizona canyon' },
  ],
  'Arkansas': [
    { src: '/location-images/Arkansas/Arkansas.jpg', alt: 'Arkansas scenic view' },
    { src: '/location-images/Arkansas/Arkansas 2.jpg', alt: 'Arkansas landscape' },
    { src: '/location-images/Arkansas/Arkansas 3.jpg', alt: 'Arkansas nature' },
  ],
  'California': [
    { src: '/location-images/California/California.jpg', alt: 'California scenic view' },
    { src: '/location-images/California/California 2.jpg', alt: 'California coastline' },
    { src: '/location-images/California/California 3.jpg', alt: 'California cityscape' },
    { src: '/location-images/California/California 4.jpg', alt: 'California landscape' },
    { src: '/location-images/California/California 5.jpg', alt: 'California sunset' },
  ],
  'Colorado': [
    { src: '/location-images/Colorado/Colorado.jpg', alt: 'Colorado scenic view' },
    { src: '/location-images/Colorado/Colorado 2.jpg', alt: 'Colorado mountains' },
    { src: '/location-images/Colorado/Colorado 3.jpg', alt: 'Colorado landscape' },
  ],
  'Connecticut': [
    { src: '/location-images/Connecticut/Connecticut.jpg', alt: 'Connecticut scenic view' },
    { src: '/location-images/Connecticut/Connecticut 2.jpg', alt: 'Connecticut landscape' },
    { src: '/location-images/Connecticut/Connecticut 3.jpg', alt: 'Connecticut town' },
    { src: '/location-images/Connecticut/Connecticut 4.jpg', alt: 'Connecticut coastline' },
  ],
  'Delaware': [
    { src: '/location-images/Delaware/Delaware.jpg', alt: 'Delaware scenic view' },
    { src: '/location-images/Delaware/Delaware 2.jpg', alt: 'Delaware landscape' },
    { src: '/location-images/Delaware/Delaware 3.jpg', alt: 'Delaware coastline' },
  ],
  'District of Columbia': [
    { src: '/location-images/District of Columbia/District of Columbia.jpg', alt: 'Washington DC scenic view' },
    { src: '/location-images/District of Columbia/District of Columbia 2.jpg', alt: 'Washington DC monuments' },
    { src: '/location-images/District of Columbia/District of Columbia 3.jpg', alt: 'Washington DC cityscape' },
  ],
  'Florida': [
    { src: '/location-images/Florida/Florida image 1.webp', alt: 'Florida scenic view' },
    { src: '/location-images/Florida/Florida Image 2.jpg', alt: 'Florida landscape' },
    { src: '/location-images/Florida/Florida Image 3.jpg', alt: 'Florida coastline' },
    { src: '/location-images/Florida/Florida Image 4.jpg', alt: 'Florida cityscape' },
    { src: '/location-images/Florida/Florida Image 5.jpg', alt: 'Florida sunset' },
  ],
  'Georgia': [
    { src: '/location-images/Georgia/Georgia.jpg', alt: 'Georgia scenic view' },
    { src: '/location-images/Georgia/Georgia 2.jpg', alt: 'Georgia landscape' },
    { src: '/location-images/Georgia/Georgia 3.jpg', alt: 'Georgia cityscape' },
  ],
  'Hawaii': [
    { src: '/location-images/Hawaii/Hilo-in-Hawaii-Island-and-Haleiwa-in-Oahu-are-amon.webp', alt: 'Hilo Hawaii' },
    { src: '/location-images/Hawaii/Oahu-Honolulu-Aerial-Hero-2_1.jpg.webp', alt: 'Honolulu aerial view' },
    { src: '/location-images/Hawaii/Papaoneone_Beach_Oahu.webp', alt: 'Papaoneone Beach Oahu' },
    { src: '/location-images/Hawaii/download.jpg', alt: 'Hawaii scenic view' },
    { src: '/location-images/Hawaii/image.webp', alt: 'Hawaii landscape' },
    { src: '/location-images/Hawaii/images.jpg', alt: 'Hawaii coastline' },
    { src: '/location-images/Hawaii/the-beautiful-and-unique-landscape-of-coastal-oahu-hawaii-and-the-kualoa-ranch-where-jurassic-park-was-filmed-as-shot-from-an-altitude-of-about-1000-feet-over-the-pacific-ocean-stockpack-istock-2048x1367.jpg', alt: 'Oahu coastal landscape' },
  ],
  'Idaho': [
    { src: '/location-images/Idaho/Idaho.jpg', alt: 'Idaho scenic view' },
    { src: '/location-images/Idaho/Idaho 2.jpg', alt: 'Idaho mountains' },
    { src: '/location-images/Idaho/Idaho 3.jpg', alt: 'Idaho landscape' },
  ],
  'Illinois': [
    { src: '/location-images/Illinois/Illinois.jpg', alt: 'Illinois scenic view' },
    { src: '/location-images/Illinois/Illinois 2.jpg', alt: 'Illinois cityscape' },
    { src: '/location-images/Illinois/Illinois 3.jpeg', alt: 'Illinois skyline' },
    { src: '/location-images/Illinois/Illinois 4.jpeg', alt: 'Illinois landscape' },
    { src: '/location-images/Illinois/Illinois 5.jpg', alt: 'Illinois downtown' },
    { src: '/location-images/Illinois/Illinois 6.jpg', alt: 'Illinois architecture' },
  ],
  'Indiana': [
    { src: '/location-images/Indiana/StateCapitolIndiana.jpg', alt: 'Indiana State Capitol' },
    { src: '/location-images/Indiana/These-Are-the-Best-Indiana-Cities-for-Your-Home-Search.jpg', alt: 'Indiana cities' },
    { src: '/location-images/Indiana/09-90803239-rivers.jpg', alt: 'Indiana rivers' },
    { src: '/location-images/Indiana/istockphoto-1068061900-612x612.jpg', alt: 'Indiana landscape' },
    { src: '/location-images/Indiana/istockphoto-1150746507-612x612.jpg', alt: 'Indiana scenic view' },
  ],
  'Iowa': [
    { src: '/location-images/Iowa/Iowa_City_Downtown_June_2021_(cropped).jpg', alt: 'Iowa City downtown' },
    { src: '/location-images/Iowa/Courier-Headers-22-1080x675-1-1.jpg', alt: 'Iowa landscape' },
    { src: '/location-images/Iowa/bs18-iowa-crop-editorial.jpg', alt: 'Iowa farmland' },
    { src: '/location-images/Iowa/download.jpg', alt: 'Iowa scenic view' },
    { src: '/location-images/Iowa/download (1).jpg', alt: 'Iowa cityscape' },
  ],
  'Kansas': [
    { src: '/location-images/Kansas/103055192_4__51a49556-9162-442a-ac1e-699635ab7ad5.jpg', alt: 'Kansas scenic view' },
    { src: '/location-images/Kansas/Wichita-ks.jpg', alt: 'Wichita Kansas skyline' },
    { src: '/location-images/Kansas/afar.brightspotcdn.jpg', alt: 'Kansas landscape' },
    { src: '/location-images/Kansas/download.jpg', alt: 'Kansas cityscape' },
    { src: '/location-images/Kansas/wichita.png', alt: 'Wichita downtown' },
  ],
  'Kentucky': [
    { src: '/location-images/Kentucky/Louisville-KY-Best-Place-to-Live-in-Kentucky.jpg.webp', alt: 'Louisville Kentucky' },
    { src: '/location-images/Kentucky/SB-Lou-DowntownGuide-FourthStreetLive-Credit-FB.jpg', alt: 'Louisville downtown' },
    { src: '/location-images/Kentucky/download.jpg', alt: 'Kentucky scenic view' },
    { src: '/location-images/Kentucky/download (1).jpg', alt: 'Kentucky landscape' },
    { src: '/location-images/Kentucky/download (2).jpg', alt: 'Kentucky cityscape' },
    { src: '/location-images/Kentucky/louisville.jpg', alt: 'Louisville skyline' },
  ],
  'Louisiana': [
    { src: '/location-images/Louisiana/d53afc6e-city-10501-171d052ebcc.jpg', alt: 'Louisiana cityscape' },
    { src: '/location-images/Louisiana/download.jpg', alt: 'Louisiana scenic view' },
    { src: '/location-images/Louisiana/download (1).jpg', alt: 'Louisiana landscape' },
    { src: '/location-images/Louisiana/download (2).jpg', alt: 'Louisiana architecture' },
    { src: '/location-images/Louisiana/download (3).jpg', alt: 'Louisiana culture' },
    { src: '/location-images/Louisiana/download (4).jpg', alt: 'Louisiana bayou' },
  ],
  'Maine': [
    { src: '/location-images/Maine/Little-Moose-Public-Lands-David-Preston.jpg', alt: 'Maine wilderness' },
    { src: '/location-images/Maine/SNGMEEnvironmentalBenefitsHeader.jpg', alt: 'Maine coastline' },
    { src: '/location-images/Maine/download.jpg', alt: 'Maine scenic view' },
    { src: '/location-images/Maine/download (1).jpg', alt: 'Maine landscape' },
    { src: '/location-images/Maine/download (2).jpg', alt: 'Maine harbor' },
  ],
  'Maryland': [
    { src: '/location-images/Maryland/43e92e9bda14ace97cc6abbf7e55ff93e8193938-1600x1066.jpg', alt: 'Maryland scenic view' },
    { src: '/location-images/Maryland/Annapolis-MD-Best-Place-to-Live-in-Maryland.jpg.webp', alt: 'Annapolis Maryland' },
    { src: '/location-images/Maryland/download.jpg', alt: 'Maryland landscape' },
    { src: '/location-images/Maryland/download (1).jpg', alt: 'Maryland cityscape' },
    { src: '/location-images/Maryland/download (2).jpg', alt: 'Maryland waterfront' },
    { src: '/location-images/Maryland/yzr4t7e7lpxnkouqakoc.webp', alt: 'Maryland harbor' },
  ],
  'Massachusetts': [
    { src: '/location-images/Massachusetts/BostonMA-BostonCommonFountain.jpg.webp', alt: 'Boston Common fountain' },
    { src: '/location-images/Massachusetts/boston-massachusetts-BOSTONTG0221-719aef2eeb1c4929b6c839715e34a69e.jpg', alt: 'Boston Massachusetts' },
    { src: '/location-images/Massachusetts/charming-small-towns-massachusetts-salem.webp', alt: 'Salem Massachusetts' },
    { src: '/location-images/Massachusetts/download.jpg', alt: 'Massachusetts scenic view' },
    { src: '/location-images/Massachusetts/download (1).jpg', alt: 'Massachusetts landscape' },
  ],
  'Michigan': [
    { src: '/location-images/Michigan/517visuals_Downtown_Lansing_2021_06_12_205107_2f163186-f5be-4d93-a3cf-1ed5706774ed.jpg', alt: 'Downtown Lansing' },
    { src: '/location-images/Michigan/_DSC1838_wilderness.jpg', alt: 'Michigan wilderness' },
    { src: '/location-images/Michigan/aerial-view_Detroit.jpg', alt: 'Detroit aerial view' },
    { src: '/location-images/Michigan/ann_arbor_state_street_downtown_1a_7b33059b-9e21-476d-a29d-bb0376068c18.jpg', alt: 'Ann Arbor downtown' },
    { src: '/location-images/Michigan/first-timers-guide-to-lake-michigan-2.png', alt: 'Lake Michigan' },
  ],
  'Minnesota': [
    { src: '/location-images/Minnesota/GettyImages-1677106988.webp', alt: 'Minnesota scenic view' },
    { src: '/location-images/Minnesota/Gray-Line-Minneapolis-Minnesota-Cover-Photo-2-scaled.webp', alt: 'Minneapolis skyline' },
    { src: '/location-images/Minnesota/Meet-Mineapolis-Hero-Skyline-social.jpg', alt: 'Minneapolis cityscape' },
    { src: '/location-images/Minnesota/superiorshore.jpg', alt: 'Lake Superior shore' },
    { src: '/location-images/Minnesota/yellowkayaks.jpg', alt: 'Minnesota kayaking' },
  ],
  'Mississippi': [
    { src: '/location-images/Mississippi/20221028-Mount-Magazine-SP-KSJ_4566psFull-1-1-1920x1080.jpg', alt: 'Mississippi scenic view' },
    { src: '/location-images/Mississippi/MSHeader2-1568x790.jpg.webp', alt: 'Mississippi landscape' },
    { src: '/location-images/Mississippi/State-capitol-building-cityscape-Jackson-Miss.webp', alt: 'Jackson Mississippi capitol' },
    { src: '/location-images/Mississippi/Under-the-radar-cover-photo.webp', alt: 'Mississippi nature' },
  ],
  'Missouri': [
    { src: '/location-images/Missouri/0x0.webp', alt: 'Missouri scenic view' },
    { src: '/location-images/Missouri/Kansas_city_(16778782291).jpg', alt: 'Kansas City skyline' },
    { src: '/location-images/Missouri/MOHeader1-1568x790.jpg.webp', alt: 'Missouri landscape' },
    { src: '/location-images/Missouri/St.LouisRecirc-debbf355bfc74443a24b4a0743793ab8.jpg', alt: 'St. Louis cityscape' },
    { src: '/location-images/Missouri/bigspring33.webp', alt: 'Missouri Big Spring' },
    { src: '/location-images/Missouri/dd2c5bb1-c9de-447f-b394-20c6a9949ea4.jpg', alt: 'Missouri downtown' },
    { src: '/location-images/Missouri/famous-wonders-of-springfield-missouri-1.webp', alt: 'Springfield Missouri' },
    { src: '/location-images/Missouri/npr.brightspotcdn.jpg', alt: 'Missouri architecture' },
  ],
  'Montana': [
    { src: '/location-images/Montana/Butte-MT-Best-Place-to-Live-in-Montana.jpg.webp', alt: 'Butte Montana' },
    { src: '/location-images/Montana/Montana-Cities-Downtown-Bozeman-scaled.jpg', alt: 'Downtown Bozeman' },
    { src: '/location-images/Montana/Montana.jpg', alt: 'Montana scenic view' },
    { src: '/location-images/Montana/RS15580_497661808-scr.webp', alt: 'Montana landscape' },
    { src: '/location-images/Montana/TAL-montana-spring-WHENMONTANA0623-0eda1754c746445ba7f0f6574218bb04-1.webp', alt: 'Montana spring' },
    { src: '/location-images/Montana/images.jpg', alt: 'Montana mountains' },
  ],
  'Nebraska': [
    { src: '/location-images/Nebraska/EF220722_19795_844b5ff0-b6d8-45d7-83e3-2f18e2f2876d.jpg', alt: 'Nebraska scenic view' },
    { src: '/location-images/Nebraska/Omaha_NE.jpg', alt: 'Omaha Nebraska skyline' },
    { src: '/location-images/Nebraska/gettyimages-1468972000.jpg', alt: 'Nebraska landscape' },
    { src: '/location-images/Nebraska/nebraskaScottsbluff_panorama.jpg', alt: 'Scotts Bluff Nebraska' },
    { src: '/location-images/Nebraska/shutterstock_2411978591-scaled-e1730383163175.jpg', alt: 'Nebraska cityscape' },
  ],
  'Nevada': [
    { src: '/location-images/Nevada/RedRock_Featured-1024x576.jpg', alt: 'Red Rock Canyon Nevada' },
    { src: '/location-images/Nevada/Reno,_Nevada_(16931715632).jpg', alt: 'Reno Nevada' },
    { src: '/location-images/Nevada/download.jpg', alt: 'Nevada scenic view' },
    { src: '/location-images/Nevada/download (1).jpg', alt: 'Nevada landscape' },
    { src: '/location-images/Nevada/download (2).jpg', alt: 'Nevada desert' },
    { src: '/location-images/Nevada/las-vegas-attractions.jpg', alt: 'Las Vegas attractions' },
    { src: '/location-images/Nevada/virginia-city-nevada-2500-1700-1.jpg', alt: 'Virginia City Nevada' },
  ],
  'New Hampshire': [
    { src: '/location-images/New Hampshire/15982881-mount-washington-new-hampshire.webp', alt: 'Mount Washington New Hampshire' },
    { src: '/location-images/New Hampshire/SOHL0823034_newhampshire_portsmouth.jpg', alt: 'Portsmouth New Hampshire' },
    { src: '/location-images/New Hampshire/aerial.webp', alt: 'New Hampshire aerial view' },
    { src: '/location-images/New Hampshire/hero-fall-instagram.jpg', alt: 'New Hampshire fall foliage' },
    { src: '/location-images/New Hampshire/iStock1057974094Lake_Winnipesaukee_NH_800x2400.jpg', alt: 'Lake Winnipesaukee' },
    { src: '/location-images/New Hampshire/maxresdefault.jpg', alt: 'New Hampshire scenic view' },
  ],
  'New Jersey': [
    { src: '/location-images/New Jersey/137_MSU_aerials_031604-X5.jpeg.1.2x.generic.jpg', alt: 'New Jersey aerial view' },
    { src: '/location-images/New Jersey/Newark-NJ-Best-Place-to-Live-in-New-Jersey.jpg.webp', alt: 'Newark New Jersey' },
    { src: '/location-images/New Jersey/attachment-olivia-hutcherson-0-Wjcr3j8CU-unsplash-1.jpg', alt: 'New Jersey scenic view' },
    { src: '/location-images/New Jersey/images.jpg', alt: 'New Jersey landscape' },
    { src: '/location-images/New Jersey/images (1).jpg', alt: 'New Jersey cityscape' },
    { src: '/location-images/New Jersey/why-you-should-think-about-vacationing-in-new-jersey.jpg', alt: 'New Jersey vacation' },
  ],
  'New Mexico': [
    { src: '/location-images/New Mexico/1200X630_albuquerque_Blog04-01.jpg', alt: 'Albuquerque New Mexico' },
    { src: '/location-images/New Mexico/GettyImages-493837532-1170x731.jpg', alt: 'New Mexico landscape' },
    { src: '/location-images/New Mexico/download.jpg', alt: 'New Mexico scenic view' },
    { src: '/location-images/New Mexico/e9a38d66-42b1-4a26-aa0e-ed47e58c24d3-GettyImages2173409242.webp', alt: 'New Mexico desert' },
    { src: '/location-images/New Mexico/images.jpg', alt: 'New Mexico cityscape' },
    { src: '/location-images/New Mexico/santa-rosa-blue-hole.jpg', alt: 'Santa Rosa Blue Hole' },
    { src: '/location-images/New Mexico/shutterstock_1253346616.jpg', alt: 'New Mexico mountains' },
  ],
  'New York': [
    { src: '/location-images/New York/323101.jpg', alt: 'New York scenic view' },
    { src: '/location-images/New York/NYC_000021208828-2100-980.jpg', alt: 'New York City skyline' },
    { src: '/location-images/New York/Overview-New-York-City.webp', alt: 'New York City overview' },
    { src: '/location-images/New York/Statue-of-Liberty-Island-New-York-Bay.webp', alt: 'Statue of Liberty' },
    { src: '/location-images/New York/buffalo-ny-skyline-GettyImages-182743353.jpg', alt: 'Buffalo New York skyline' },
    { src: '/location-images/New York/image.jpg', alt: 'New York landscape' },
    { src: '/location-images/New York/images.jpg', alt: 'New York cityscape' },
    { src: '/location-images/New York/shutterstock-2322249997.jpg', alt: 'New York state' },
  ],
  'North Carolina': [
    { src: '/location-images/North Carolina/AdobeStock_82317108_Raleigh_Resize.jpg', alt: 'Raleigh North Carolina' },
    { src: '/location-images/North Carolina/Untitled-design-88-r9a5v7y1co3zufqp1nsnkinvex5z556g24ygc07nn4.png', alt: 'North Carolina scenic view' },
    { src: '/location-images/North Carolina/caption.jpg', alt: 'North Carolina landscape' },
    { src: '/location-images/North Carolina/download.jpg', alt: 'North Carolina cityscape' },
    { src: '/location-images/North Carolina/download (1).jpg', alt: 'North Carolina mountains' },
  ],
  'North Dakota': [
    { src: '/location-images/North Dakota/Capitol-Bismarck-North-Dakota.webp', alt: 'Bismarck North Dakota capitol' },
    { src: '/location-images/North Dakota/North-Dakota-Capitol-768x511.jpg.webp', alt: 'North Dakota capitol building' },
    { src: '/location-images/North Dakota/TRNPNorthUnitScenicByway-w.jpg', alt: 'Theodore Roosevelt National Park' },
    { src: '/location-images/North Dakota/latest-news_Web.jpg', alt: 'North Dakota landscape' },
  ],
  'Ohio': [
    { src: '/location-images/Ohio/ClevelandOH-NighttimeSkyline-768x510.jpg.webp', alt: 'Cleveland Ohio skyline' },
    { src: '/location-images/Ohio/JacksonLakeSP-head.jpg', alt: 'Jackson Lake State Park Ohio' },
    { src: '/location-images/Ohio/image-411.png', alt: 'Ohio scenic view' },
    { src: '/location-images/Ohio/my-hometowns-skyline-marietta-ohio-i-hope-this-is-allowed-v0-6uvp64ldzmlc1.webp', alt: 'Marietta Ohio skyline' },
  ],
  'Oklahoma': [
    { src: '/location-images/Oklahoma/1482338657_1482338649-hwy325kentonkimbakerslideshow.jpg', alt: 'Oklahoma countryside' },
    { src: '/location-images/Oklahoma/ConventionCenter+Skyline-ScissortailPark.jpg', alt: 'Oklahoma City Scissortail Park' },
    { src: '/location-images/Oklahoma/GettyImages-183353738.jpg', alt: 'Oklahoma landscape' },
    { src: '/location-images/Oklahoma/Guthrie-Oklahoma.jpg', alt: 'Guthrie Oklahoma' },
    { src: '/location-images/Oklahoma/OklahomaCityOK-Bricktown_0.jpg.webp', alt: 'Oklahoma City Bricktown' },
    { src: '/location-images/Oklahoma/Screen-Shot-2021-04-12-at-11.52.35-AM-1024x430.png', alt: 'Oklahoma scenic view' },
    { src: '/location-images/Oklahoma/images.jpg', alt: 'Oklahoma cityscape' },
    { src: '/location-images/Oklahoma/istockphoto-639246126-612x612.jpg', alt: 'Oklahoma sunset' },
  ],
  'Oregon': [
    { src: '/location-images/Oregon/AdobeStock_445968585-scaled-aspect-ratio-3-2-scaled.jpg', alt: 'Oregon scenic view' },
    { src: '/location-images/Oregon/HERO 1_Oregon Coast-Photo by Larry Geddis_CROPPED_Web72DPI.jpg', alt: 'Oregon Coast' },
    { src: '/location-images/Oregon/Portland-skyline2.jpg', alt: 'Portland Oregon skyline' },
    { src: '/location-images/Oregon/download.jpg', alt: 'Oregon landscape' },
    { src: '/location-images/Oregon/iStock-2171251252-HEADERMOBILE.webp', alt: 'Oregon nature' },
    { src: '/location-images/Oregon/original.jpg', alt: 'Oregon wilderness' },
    { src: '/location-images/Oregon/shutterstock_100879744-scaled.jpg', alt: 'Oregon mountains' },
    { src: '/location-images/Oregon/shutterstock_1265667472.jpg', alt: 'Oregon forest' },
  ],
  'Pennsylvania': [
    { src: '/location-images/Pennsylvania/628cfb5c12cbf9e3834f0953.webp', alt: 'Pennsylvania scenic view' },
    { src: '/location-images/Pennsylvania/Hero-2.jpg', alt: 'Pennsylvania landscape' },
    { src: '/location-images/Pennsylvania/Moving_to_Pittsburgh_PA_Header.jpg', alt: 'Pittsburgh Pennsylvania' },
    { src: '/location-images/Pennsylvania/images.jpg', alt: 'Pennsylvania cityscape' },
    { src: '/location-images/Pennsylvania/intro-1738719939.jpg', alt: 'Pennsylvania countryside' },
    { src: '/location-images/Pennsylvania/maxresdefault.jpg', alt: 'Pennsylvania skyline' },
    { src: '/location-images/Pennsylvania/pinnacle-1.jpg', alt: 'Pennsylvania mountains' },
  ],
  'Rhode Island': [
    { src: '/location-images/Rhode Island/19878.jpg', alt: 'Rhode Island scenic view' },
    { src: '/location-images/Rhode Island/GettyImages-1316977160.webp', alt: 'Rhode Island coastline' },
    { src: '/location-images/Rhode Island/bowens-wharf-scaled-1.jpg', alt: 'Bowens Wharf Rhode Island' },
    { src: '/location-images/Rhode Island/cliff-walk-rhode-island_RHODEISLAND1022-f6ec752a7bfd446b87141969db2ba657.jpg', alt: 'Rhode Island Cliff Walk' },
    { src: '/location-images/Rhode Island/intro-1744136989.jpg', alt: 'Rhode Island landscape' },
    { src: '/location-images/Rhode Island/providence-rhode-island.jpg', alt: 'Providence Rhode Island' },
    { src: '/location-images/Rhode Island/updated-aerial2-4e134b895056b3a_4e1359cd-5056-b3a8-4933fc314db0632d.jpg', alt: 'Rhode Island aerial view' },
    { src: '/location-images/Rhode Island/winterskyline_nicholas-millard_b0ab7aeb-d566-8359-c188f7a9639f4527.jpg', alt: 'Rhode Island winter skyline' },
  ],
  'South Carolina': [
    { src: '/location-images/South Carolina/0-greenville_Patti-Morrow_luggageandlipstick.com_.jpg', alt: 'Greenville South Carolina' },
    { src: '/location-images/South Carolina/0211-8900.jpg', alt: 'South Carolina scenic view' },
    { src: '/location-images/South Carolina/1140-downtown-charleston-south-carolina.png', alt: 'Downtown Charleston' },
    { src: '/location-images/South Carolina/23267.jpg', alt: 'South Carolina landscape' },
    { src: '/location-images/South Carolina/63d022e80a8380a05be1451d.webp', alt: 'South Carolina coastline' },
    { src: '/location-images/South Carolina/SCHeader7-1568x790.jpg', alt: 'South Carolina nature' },
    { src: '/location-images/South Carolina/The-Most-Boring-Towns-In-South-Carolina-That-Locals-Call-Perfectly-Still.jpg', alt: 'South Carolina town' },
    { src: '/location-images/South Carolina/image2-163.jpg', alt: 'South Carolina cityscape' },
  ],
  'South Dakota': [
    { src: '/location-images/South Dakota/Rapid-City-SD-Best-Place-to-live-in-South-Dakota.jpg.webp', alt: 'Rapid City South Dakota' },
    { src: '/location-images/South Dakota/South-Dakota_TW-Hero.jpg', alt: 'South Dakota scenic view' },
    { src: '/location-images/South Dakota/download.jpg', alt: 'South Dakota landscape' },
    { src: '/location-images/South Dakota/falls-park-summer.jpg', alt: 'Falls Park South Dakota' },
    { src: '/location-images/South Dakota/www.usnews.jpg', alt: 'South Dakota cityscape' },
  ],
  'Tennessee': [
    { src: '/location-images/Tennessee/1.12_PFEngagement.webp', alt: 'Tennessee scenic view' },
    { src: '/location-images/Tennessee/Great-Smoky-smlandscape21.avif', alt: 'Great Smoky Mountains' },
    { src: '/location-images/Tennessee/Music-city-1.jpg', alt: 'Nashville Music City' },
    { src: '/location-images/Tennessee/Nashville_broadway_honky_tonks_2000x1125.jpg', alt: 'Nashville Broadway' },
    { src: '/location-images/Tennessee/RYM_Content_2025_ThingsToDo_1200x628-a4cea20894.webp', alt: 'Tennessee attractions' },
    { src: '/location-images/Tennessee/download.jpg', alt: 'Tennessee landscape' },
    { src: '/location-images/Tennessee/memphis-tennessee-tn-downtown-drone-skyline-aerial-picture-id1184734050-1.jpg', alt: 'Memphis Tennessee skyline' },
  ],
  'Texas': [
    { src: '/location-images/Texas/2e.jpg', alt: 'Texas scenic view' },
    { src: '/location-images/Texas/Austin-Skyline-shutterstock_681676399-scaled.jpg', alt: 'Austin Texas skyline' },
    { src: '/location-images/Texas/Header-Image-1024x684.jpg', alt: 'Texas landscape' },
    { src: '/location-images/Texas/TFBIC-1107-Cutest-Main-Streets-Georgetown-photo-credit-Rudy-Ximenez-1024x683.jpg', alt: 'Georgetown Texas' },
    { src: '/location-images/Texas/TXE-Tem.-FT-Image.webp', alt: 'Texas cityscape' },
    { src: '/location-images/Texas/dallas.jpg', alt: 'Dallas Texas' },
    { src: '/location-images/Texas/download.jpg', alt: 'Texas downtown' },
    { src: '/location-images/Texas/download (1).jpg', alt: 'Texas architecture' },
    { src: '/location-images/Texas/dry-desert-west-texas-scaled.jpg', alt: 'West Texas desert' },
    { src: '/location-images/Texas/img_11811.jpg', alt: 'Texas nature' },
    { src: '/location-images/Texas/texas-facts.jpg', alt: 'Texas facts' },
  ],
  'Utah': [
    { src: '/location-images/Utah/AdobeStock_107801683.jpg', alt: 'Utah scenic view' },
    { src: '/location-images/Utah/AdobeStock_219359615.jpg', alt: 'Utah landscape' },
    { src: '/location-images/Utah/Montage-Deer-Valley-image-1.jpg', alt: 'Deer Valley Utah' },
    { src: '/location-images/Utah/bccf39bccd209677c073fa48f32b9406.jpg', alt: 'Utah mountains' },
    { src: '/location-images/Utah/city_break_salt_lake_city.jpg', alt: 'Salt Lake City' },
    { src: '/location-images/Utah/download.jpg', alt: 'Utah cityscape' },
    { src: '/location-images/Utah/shutterstock-1799420974.jpg', alt: 'Utah nature' },
    { src: '/location-images/Utah/ski1120-rgw2-deervalley-courtesy-baldmtn-v2.jpg', alt: 'Utah skiing' },
  ],
  'Vermont': [
    { src: '/location-images/Vermont/37dde9f4-30c8-4809-a327-3c961c57a836-GettyImages-484270482_foliage.webp', alt: 'Vermont fall foliage' },
    { src: '/location-images/Vermont/Winter_in_Burlington_2100x1399_9b361a35_cebc_4bf0_b22d_7bf2ea19d74d_1__6035ec26-794e-4e00-bb51-00bcc2c18592.jpg', alt: 'Burlington Vermont winter' },
    { src: '/location-images/Vermont/download.jpg', alt: 'Vermont scenic view' },
    { src: '/location-images/Vermont/things_to_do_in_burlington_vt_75933a781d.webp', alt: 'Burlington Vermont' },
    { src: '/location-images/Vermont/top-10-things-to-do-in-vermont-mountains-maple-small-town-charm-wQ-1024x574.jpg', alt: 'Vermont mountains' },
  ],
  'Virginia': [
    { src: '/location-images/Virginia/247739725_10161294631605558_4027226096542341256_n-2000-e68c6e17f3fc45afb6516117e706c52f.jpg', alt: 'Virginia scenic view' },
    { src: '/location-images/Virginia/Pros_and_Cons_of_Living_in_Virginia_fa487b899f.jpg', alt: 'Virginia landscape' },
    { src: '/location-images/Virginia/Richmond-VA-Best-Place-to-Live-in-Virginia.jpg', alt: 'Richmond Virginia' },
    { src: '/location-images/Virginia/ancient-dna-is-solving-colonial-mysteries-in-jamestown-391848-960x540.jpg', alt: 'Jamestown Virginia' },
    { src: '/location-images/Virginia/download.jpg', alt: 'Virginia cityscape' },
    { src: '/location-images/Virginia/download (1).jpg', alt: 'Virginia mountains' },
    { src: '/location-images/Virginia/download (2).jpg', alt: 'Virginia countryside' },
    { src: '/location-images/Virginia/l-intro-1685455313.jpg', alt: 'Virginia nature' },
  ],
  'Washington': [
    { src: '/location-images/Washington/FO_Waterfront-Seattle_1_Photo-by-Erik-Holsather-courtesy-Friends-of-Waterfront-Park.webp', alt: 'Seattle waterfront' },
    { src: '/location-images/Washington/Seattle_Dest_42-52432475.jpg', alt: 'Seattle Washington' },
    { src: '/location-images/Washington/coupeville-washington_SMTOWNWA0722-ec93be516eb34806b3eb004a4f76901f.jpg', alt: 'Coupeville Washington' },
    { src: '/location-images/Washington/download (1).jpg', alt: 'Washington landscape' },
    { src: '/location-images/Washington/heatherpass_1600.jpg', alt: 'Washington mountains' },
    { src: '/location-images/Washington/images.jpg', alt: 'Washington scenic view' },
  ],
  'West Virginia': [
    { src: '/location-images/West Virginia/9a575dda699f070098dc868683e925613fe8b803-1600x1066.jpg', alt: 'West Virginia scenic view' },
    { src: '/location-images/West Virginia/HarpersFerry-1-1024x683-1.webp', alt: 'Harpers Ferry West Virginia' },
    { src: '/location-images/West Virginia/Morgantown-WV-Best-Place-to-Live-in-West-Virginia.jpg.webp', alt: 'Morgantown West Virginia' },
    { src: '/location-images/West Virginia/download.jpg', alt: 'West Virginia landscape' },
    { src: '/location-images/West Virginia/download (1).jpg', alt: 'West Virginia mountains' },
    { src: '/location-images/West Virginia/new-river-gorge-aerial-copy.jpg', alt: 'New River Gorge' },
    { src: '/location-images/West Virginia/shutterstock-2490348523.jpg', alt: 'West Virginia nature' },
  ],
  'Wisconsin': [
    { src: '/location-images/Wisconsin/11delightfultownsbanner.webp', alt: 'Wisconsin towns' },
    { src: '/location-images/Wisconsin/210303-uwisconsin-editorial.jpg', alt: 'University of Wisconsin' },
    { src: '/location-images/Wisconsin/GettyImages-1007532674-5c2e3e6346e0fb00011fc7b0.jpg', alt: 'Wisconsin scenic view' },
    { src: '/location-images/Wisconsin/Madison-Riverfront-opt.jpg', alt: 'Madison Wisconsin riverfront' },
    { src: '/location-images/Wisconsin/Milwaukee-WI-Best-Place-to-Live-in-Wisconisn.jpg', alt: 'Milwaukee Wisconsin' },
    { src: '/location-images/Wisconsin/WOPA070607D113.jpg', alt: 'Wisconsin landscape' },
    { src: '/location-images/Wisconsin/images.jpg', alt: 'Wisconsin cityscape' },
    { src: '/location-images/Wisconsin/shutterstock_1930768997-scaled-e1730773643316.jpg', alt: 'Wisconsin nature' },
  ],
  'Wyoming': [
    { src: '/location-images/Wyoming/Cheyenne-Wyoming.-Photo-by-Isabella-Miller.jpg', alt: 'Cheyenne Wyoming' },
    { src: '/location-images/Wyoming/TAL-grand-teton-natinoal-park-JACKSONHOLEWY0823-b7405185a64f49b5aaf48e15b01b7744.jpg', alt: 'Grand Teton National Park' },
    { src: '/location-images/Wyoming/jacksonhole-mountainresort.jpg', alt: 'Jackson Hole mountain resort' },
    { src: '/location-images/Wyoming/tetos_2.jpg', alt: 'Wyoming Tetons' },
  ],
  'Miami': [
    { src: '/location-images/Miami/Miami Image 1.jpg', alt: 'Miami skyline' },
    { src: '/location-images/Miami/Miami Image 2.jpg', alt: 'Miami Beach' },
    { src: '/location-images/Miami/Miami Image 3.jpg', alt: 'Miami waterfront' },
    { src: '/location-images/Miami/Miami Image 4.jpg', alt: 'Miami cityscape' },
    { src: '/location-images/Miami/Miami Image 5.jpg', alt: 'Miami aerial view' },
    { src: '/location-images/Miami/download.jpg', alt: 'Miami downtown' },
  ],
  'Orlando': [
    { src: '/location-images/Orlando/Orlando Image 1.jpg', alt: 'Orlando skyline' },
    { src: '/location-images/Orlando/Orlando Image 2.jpg', alt: 'Orlando cityscape' },
  ],
};

/**
 * Get images for a location. Checks exact name first, then state name.
 * Returns null if no images are configured for this location.
 */
export function getLocationImages(locationName: string): LocationImage[] | null {
  // Direct match
  if (LOCATION_IMAGES[locationName]) {
    return LOCATION_IMAGES[locationName];
  }

  // For cities like "Miami, FL" — try city name first, then state
  const parts = locationName.split(', ');
  if (parts.length >= 2) {
    // Try city name match first (e.g., "Miami" from "Miami, FL")
    const cityName = parts[0].trim();
    if (LOCATION_IMAGES[cityName]) {
      return LOCATION_IMAGES[cityName];
    }

    const stateAbbrev = parts[parts.length - 1].trim();
    // Try matching by abbreviation using a reverse lookup
    const stateNames: Record<string, string> = {
      'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
      'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
      'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
      'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
      'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
      'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
      'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
      'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
      'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
      'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
      'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
      'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
      'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia',
    };
    const stateName = stateNames[stateAbbrev];
    if (stateName && LOCATION_IMAGES[stateName]) {
      return LOCATION_IMAGES[stateName];
    }
  }

  return null;
}
