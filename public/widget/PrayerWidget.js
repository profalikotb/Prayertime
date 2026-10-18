// مواقيت الصلاة – أ.د. على قطب · Scriptable widget (iOS Lock Screen + Home Screen)
// Lock Screen (rectangular):
//   • Parameter empty  → NEXT PRAYER: big name + time + big live countdown
//   • Parameter "times" → TODAY: all five times in large type
//   Inline (above the clock) and circular also supported.
//   Colour on the Lock Screen follows the clock colour you choose in Customize (iOS tints all lock widgets).
// Home Screen / StandBy: small, medium, large — full colour, large type.
// Same astronomy & conventions as the web app: Egyptian Survey (19.5°/17.5°) in Egypt,
// Umm al-Qura (18.5° / Maghrib+90, +120 in Ramadan) in Saudi Arabia, MWL elsewhere;
// prayers rounded to the nearest minute, sunrise rounded down.
// Tap opens the app.

const APP_URL = 'https://prayertimealikotb.vercel.app';
const FALLBACK = { lat: 30.0444, lng: 31.2357, name: 'القاهرة', cc: 'EG' }; // used if location is unavailable
const AR = { fajr: 'الفجر', sunrise: 'الشروق', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' };
const ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

/* ---------------- engine: adhan.js (identical to the web app) ---------------- */
// adhan.js prayer-time engine (MIT, Batoul Apps) — refreshed by `npm run widget`
const adhan = (function () {
  var module = { exports: {} };
  var exports = module.exports;
  /* ADHAN-BEGIN */
!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?e(exports):"function"==typeof define&&define.amd?define(["exports"],e):e((t="undefined"!=typeof globalThis?globalThis:t||self).adhan={})}(this,function(t){"use strict";function e(t,e,n){return(e=function(t){var e=function(t,e){if("object"!=typeof t||!t)return t;var n=t[Symbol.toPrimitive];if(void 0!==n){var r=n.call(t,e);if("object"!=typeof r)return r;throw new TypeError("@@toPrimitive must return a primitive value.")}return("string"===e?String:Number)(t)}(t,"string");return"symbol"==typeof e?e:e+""}(e))in t?Object.defineProperty(t,e,{value:n,enumerable:!0,configurable:!0,writable:!0}):t[e]=n,t}function n(t,e){var n=Object.keys(t);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(t);e&&(r=r.filter(function(e){return Object.getOwnPropertyDescriptor(t,e).enumerable})),n.push.apply(n,r)}return n}function r(t){for(var r=1;r<arguments.length;r++){var i=null!=arguments[r]?arguments[r]:{};r%2?n(Object(i),!0).forEach(function(n){e(t,n,i[n])}):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(i)):n(Object(i)).forEach(function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(i,e))})}return t}const i={Shafi:"shafi",Hanafi:"hanafi"};const a={MiddleOfTheNight:"middleofthenight",SeventhOfTheNight:"seventhofthenight",TwilightAngle:"twilightangle",recommended:t=>t.latitude>48?a.SeventhOfTheNight:a.MiddleOfTheNight};class s{constructor(t,e){this.latitude=t,this.longitude=e}}const o={Nearest:"nearest",Up:"up",None:"none"};function h(t,e){const n=t.getFullYear(),r=t.getMonth(),i=t.getDate()+e,a=t.getHours(),s=t.getMinutes(),o=t.getSeconds();return new Date(n,r,i,a,s,o)}function u(t,e){return l(t,60*e)}function l(t,e){return new Date(t.getTime()+1e3*e)}function c(t){let e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:o.Nearest;const n=t.getUTCSeconds();let r=n>=30?60-n:-1*n;return e===o.Up?r=60-n:e===o.None&&(r=0),l(t,r)}function d(t){return t%4==0&&(t%100!=0||t%400==0)}function g(t){let e=0;const n=[31,d(t.getFullYear())?29:28,31,30,31,30,31,31,30,31,30,31];for(let r=0;r<t.getMonth();r++)e+=n[r];return e+=t.getDate(),e}function m(t){return t instanceof Date&&!isNaN(t.valueOf())}function f(t){return t*Math.PI/180}function M(t){return 180*t/Math.PI}function p(t,e){return t-e*Math.floor(t/e)}function b(t){return p(t,360)}const w={General:"general",Ahmer:"ahmer",Abyad:"abyad"},A={meanSolarLongitude(t){const e=t;return b(280.4664567+36000.76983*e+3032e-7*Math.pow(e,2))},meanLunarLongitude:t=>b(218.3165+481267.8813*t),ascendingLunarNodeLongitude(t){const e=t;return b(125.04452-1934.136261*e+.0020708*Math.pow(e,2)+Math.pow(e,3)/45e4)},meanSolarAnomaly(t){const e=t;return b(357.52911+35999.05029*e-1537e-7*Math.pow(e,2))},solarEquationOfTheCenter(t,e){const n=t,r=f(e);return(1.914602-.004817*n-14e-6*Math.pow(n,2))*Math.sin(r)+(.019993-101e-6*n)*Math.sin(2*r)+289e-6*Math.sin(3*r)},apparentSolarLongitude(t,e){const n=t,r=125.04-1934.136*n;return b(e+A.solarEquationOfTheCenter(n,A.meanSolarAnomaly(n))-.00569-.00478*Math.sin(f(r)))},meanObliquityOfTheEcliptic(t){const e=t;return 23.439291-.013004167*e-1.639e-7*Math.pow(e,2)+5.036e-7*Math.pow(e,3)},apparentObliquityOfTheEcliptic(t,e){const n=125.04-1934.136*t;return e+.00256*Math.cos(f(n))},meanSiderealTime(t){const e=t;return b(280.46061837+360.98564736629*(36525*e+2451545-2451545)+387933e-9*Math.pow(e,2)-Math.pow(e,3)/3871e4)},nutationInLongitude(t,e,n,r){const i=e,a=n,s=r;return-17.2/3600*Math.sin(f(s))-1.32/3600*Math.sin(2*f(i))-.23/3600*Math.sin(2*f(a))+.21/3600*Math.sin(2*f(s))},nutationInObliquity(t,e,n,r){const i=e,a=n,s=r;return 9.2/3600*Math.cos(f(s))+.57/3600*Math.cos(2*f(i))+.1/3600*Math.cos(2*f(a))-.09/3600*Math.cos(2*f(s))},altitudeOfCelestialBody(t,e,n){const r=t,i=e,a=n,s=Math.sin(f(r))*Math.sin(f(i)),o=Math.cos(f(r))*Math.cos(f(i))*Math.cos(f(a));return M(Math.asin(s+o))},approximateTransit(t,e,n){const r=t,i=p((n+-1*r-e)/360,1),a=p((12-r/15)/24,1);return i-a>.5?i-1:a-i>.5?i+1:i},correctedTransit(t,e,n,r,i,a){const s=t,o=r,h=i,u=a,l=-1*e,c=b(n+360.985647*s),d=b(A.interpolateAngles(o,h,u,s));var g;return 24*(s+((g=c-l-d)>=-180&&g<=180?g:g-360*Math.round(g/360))/-360)},correctedHourAngle(t,e,n,r,i,a,s,o,h,u,l){const c=t,d=e,g=i,m=a,p=s,w=o,j=h,T=u,S=l,v=-1*n.longitude,y=Math.sin(f(d))-Math.sin(f(n.latitude))*Math.sin(f(j)),D=Math.cos(f(n.latitude))*Math.cos(f(j)),O=M(Math.acos(y/D)),N=r?c+O/360:c-O/360,P=b(g+360.985647*N),C=b(A.interpolateAngles(m,p,w,N)),L=A.interpolate(j,T,S,N),F=P-v-C;return 24*(N+(A.altitudeOfCelestialBody(n.latitude,L,F)-d)/(360*Math.cos(f(L))*Math.cos(f(n.latitude))*Math.sin(f(F))))},interpolate(t,e,n,r){const i=t-e,a=n-t;return t+r/2*(i+a+r*(a-i))},interpolateAngles(t,e,n,r){const i=b(t-e),a=b(n-t);return t+r/2*(i+a+r*(a-i))},julianDay(t,e,n){let r=arguments.length>3&&void 0!==arguments[3]?arguments[3]:0;const i=Math.trunc,a=i(e>2?t:t-1),s=i(e>2?e:e+12),o=n+r/24,h=i(a/100),u=i(2-h+i(h/4));return i(365.25*(a+4716))+i(30.6001*(s+1))+o+u-1524.5},julianCentury:t=>(t-2451545)/36525,seasonAdjustedMorningTwilight(t,e,n,r){const i=75+28.65/55*Math.abs(t),a=75+19.44/55*Math.abs(t),s=75+32.74/55*Math.abs(t),o=75+48.1/55*Math.abs(t),h=function(){const r=A.daysSinceSolstice(e,n,t);return r<91?i+(a-i)/91*r:r<137?a+(s-a)/46*(r-91):r<183?s+(o-s)/46*(r-137):r<229?o+(s-o)/46*(r-183):r<275?s+(a-s)/46*(r-229):a+(i-a)/91*(r-275)}();return l(r,Math.round(-60*h))},seasonAdjustedEveningTwilight(t,e,n,r,i){let a,s,o,h;i===w.Ahmer?(a=62+17.4/55*Math.abs(t),s=62-7.16/55*Math.abs(t),o=62+5.12/55*Math.abs(t),h=62+19.44/55*Math.abs(t)):i===w.Abyad?(a=75+25.6/55*Math.abs(t),s=75+7.16/55*Math.abs(t),o=75+36.84/55*Math.abs(t),h=75+1.488*Math.abs(t)):(a=75+25.6/55*Math.abs(t),s=75+2.05/55*Math.abs(t),o=75-9.21/55*Math.abs(t),h=75+6.14/55*Math.abs(t));const u=function(){const r=A.daysSinceSolstice(e,n,t);return r<91?a+(s-a)/91*r:r<137?s+(o-s)/46*(r-91):r<183?o+(h-o)/46*(r-137):r<229?h+(o-h)/46*(r-183):r<275?o+(s-o)/46*(r-229):s+(a-s)/91*(r-275)}();return l(r,Math.round(60*u))},daysSinceSolstice(t,e,n){let r;const i=d(e)?173:172,a=d(e)?366:365;return n>=0?(r=t+10,r>=a&&(r-=a)):(r=t-i,r<0&&(r+=a)),r}};class j{constructor(t){const e=A.julianCentury(t),n=A.meanSolarLongitude(e),r=A.meanLunarLongitude(e),i=A.ascendingLunarNodeLongitude(e),a=f(A.apparentSolarLongitude(e,n)),s=A.meanSiderealTime(e),o=A.nutationInLongitude(e,n,r,i),h=A.nutationInObliquity(e,n,r,i),u=A.meanObliquityOfTheEcliptic(e),l=f(A.apparentObliquityOfTheEcliptic(e,u));this.declination=M(Math.asin(Math.sin(l)*Math.sin(a))),this.rightAscension=b(M(Math.atan2(Math.cos(l)*Math.sin(a),Math.cos(a)))),this.apparentSiderealTime=s+3600*o*Math.cos(f(u+h))/3600}}class T{constructor(t,e){const n=A.julianDay(t.getFullYear(),t.getMonth()+1,t.getDate(),0);this.observer=e,this.solar=new j(n),this.prevSolar=new j(n-1),this.nextSolar=new j(n+1);const r=A.approximateTransit(e.longitude,this.solar.apparentSiderealTime,this.solar.rightAscension),i=-50/60;this.approxTransit=r,this.transit=A.correctedTransit(r,e.longitude,this.solar.apparentSiderealTime,this.solar.rightAscension,this.prevSolar.rightAscension,this.nextSolar.rightAscension),this.sunrise=A.correctedHourAngle(r,i,e,!1,this.solar.apparentSiderealTime,this.solar.rightAscension,this.prevSolar.rightAscension,this.nextSolar.rightAscension,this.solar.declination,this.prevSolar.declination,this.nextSolar.declination),this.sunset=A.correctedHourAngle(r,i,e,!0,this.solar.apparentSiderealTime,this.solar.rightAscension,this.prevSolar.rightAscension,this.nextSolar.rightAscension,this.solar.declination,this.prevSolar.declination,this.nextSolar.declination)}hourAngle(t,e){return A.correctedHourAngle(this.approxTransit,t,this.observer,e,this.solar.apparentSiderealTime,this.solar.rightAscension,this.prevSolar.rightAscension,this.nextSolar.rightAscension,this.solar.declination,this.prevSolar.declination,this.nextSolar.declination)}afternoon(t){const e=Math.abs(this.observer.latitude-this.solar.declination),n=t+Math.tan(f(e)),r=M(Math.atan(1/n));return this.hourAngle(r,!0)}}const S={AqrabBalad:"AqrabBalad",AqrabYaum:"AqrabYaum",Unresolved:"Unresolved"},v=t=>!isNaN(t.sunrise)&&!isNaN(t.sunset),y=function(t,e){let n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:1,r=arguments.length>3&&void 0!==arguments[3]?arguments[3]:1;if(n>Math.ceil(182.5))return null;const i=new Date(e.getTime());i.setDate(i.getDate()+r*n);const a=h(i,1),s=new T(i,t),o=new T(a,t);return v(s)&&v(o)?{date:e,tomorrow:a,coordinates:t,solarTime:s,tomorrowSolarTime:o}:y(t,e,n+(r>0?0:1),-r)},D=(t,e,n)=>{const i=new T(e,r(r({},t),{},{latitude:n})),a=h(e,1),o=new T(a,r(r({},t),{},{latitude:n}));return v(i)&&v(o)?{date:e,tomorrow:a,coordinates:new s(n,t.longitude),solarTime:i,tomorrowSolarTime:o}:Math.abs(n)>=65?D(t,e,n-.5*Math.sign(n)):null};class O{constructor(t){let n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0,r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:0,s=arguments.length>3&&void 0!==arguments[3]?arguments[3]:0,h=arguments.length>4&&void 0!==arguments[4]?arguments[4]:0;e(this,"madhab",i.Shafi),e(this,"highLatitudeRule",a.MiddleOfTheNight),e(this,"adjustments",{fajr:0,sunrise:0,dhuhr:0,asr:0,maghrib:0,isha:0}),e(this,"methodAdjustments",{fajr:0,sunrise:0,dhuhr:0,asr:0,maghrib:0,isha:0}),e(this,"polarCircleResolution",S.Unresolved),e(this,"rounding",o.Nearest),e(this,"shafaq",w.General),this.method=t,this.fajrAngle=n,this.ishaAngle=r,this.ishaInterval=s,this.maghribAngle=h,null===this.method&&(this.method="Other")}nightPortions(){switch(this.highLatitudeRule){case a.MiddleOfTheNight:return{fajr:.5,isha:.5};case a.SeventhOfTheNight:return{fajr:1/7,isha:1/7};case a.TwilightAngle:return{fajr:this.fajrAngle/60,isha:this.ishaAngle/60};default:throw"Invalid high latitude rule found when attempting to compute night portions: ".concat(this.highLatitudeRule)}}}const N={MuslimWorldLeague(){const t=new O("MuslimWorldLeague",18,17);return t.methodAdjustments.dhuhr=1,t},Egyptian(){const t=new O("Egyptian",19.5,17.5);return t.methodAdjustments.dhuhr=1,t},Karachi(){const t=new O("Karachi",18,18);return t.methodAdjustments.dhuhr=1,t},UmmAlQura:()=>new O("UmmAlQura",18.5,0,90),Dubai(){const t=new O("Dubai",18.2,18.2);return t.methodAdjustments=r(r({},t.methodAdjustments),{},{sunrise:-3,dhuhr:3,asr:3,maghrib:3}),t},MoonsightingCommittee(){const t=new O("MoonsightingCommittee",18,18);return t.methodAdjustments=r(r({},t.methodAdjustments),{},{dhuhr:5,maghrib:3}),t},NorthAmerica(){const t=new O("NorthAmerica",15,15);return t.methodAdjustments.dhuhr=1,t},Kuwait:()=>new O("Kuwait",18,17.5),Qatar:()=>new O("Qatar",18,0,90),Singapore(){const t=new O("Singapore",20,18);return t.methodAdjustments.dhuhr=1,t.rounding=o.Up,t},Tehran:()=>new O("Tehran",17.7,14,0,4.5),Turkey(){const t=new O("Turkey",18,17);return t.methodAdjustments=r(r({},t.methodAdjustments),{},{sunrise:-7,dhuhr:5,asr:4,maghrib:7}),t},Other:()=>new O("Other",0,0)},P={Fajr:"fajr",Sunrise:"sunrise",Dhuhr:"dhuhr",Asr:"asr",Maghrib:"maghrib",Isha:"isha",None:"none"};class C{constructor(t){return this.hours=Math.floor(t),this.minutes=Math.floor(60*(t-this.hours)),this.seconds=Math.floor(60*(t-(this.hours+this.minutes/60))*60),this}utcDate(t,e,n){return new Date(Date.UTC(t,e,n,this.hours,this.minutes,this.seconds))}}class L{constructor(t,e,n){this.coordinates=t,this.date=e,this.calculationParameters=n;let r,a,s,o,d,f,M,p,b=new T(e,t);s=new C(b.transit).utcDate(e.getFullYear(),e.getMonth(),e.getDate()),a=new C(b.sunrise).utcDate(e.getFullYear(),e.getMonth(),e.getDate()),d=new C(b.sunset).utcDate(e.getFullYear(),e.getMonth(),e.getDate());const w=h(e,1);let j=new T(w,t);const v=n.polarCircleResolution;if((!m(a)||!m(d)||isNaN(j.sunrise))&&v!==S.Unresolved){const n=((t,e,n)=>{const r={date:e,tomorrow:h(e,1),coordinates:n,solarTime:new T(e,n),tomorrowSolarTime:new T(h(e,1),n)};switch(t){case S.AqrabYaum:return y(n,e)||r;case S.AqrabBalad:{const t=n.latitude;return D(n,e,t-.5*Math.sign(t))||r}default:return r}})(v,e,t);b=n.solarTime,j=n.tomorrowSolarTime;const r=[e.getFullYear(),e.getMonth(),e.getDate()];s=new C(b.transit).utcDate(...r),a=new C(b.sunrise).utcDate(...r),d=new C(b.sunset).utcDate(...r)}o=new C(b.afternoon(function(t){switch(t){case i.Shafi:return 1;case i.Hanafi:return 2;default:throw"Invalid Madhab"}}(n.madhab))).utcDate(e.getFullYear(),e.getMonth(),e.getDate());const O=new C(j.sunrise).utcDate(w.getFullYear(),w.getMonth(),w.getDate()),N=(Number(O)-Number(d))/1e3;r=new C(b.hourAngle(-1*n.fajrAngle,!1)).utcDate(e.getFullYear(),e.getMonth(),e.getDate()),"MoonsightingCommittee"===n.method&&t.latitude>=55&&(p=N/7,r=l(a,-p));const P=function(){if("MoonsightingCommittee"===n.method)return A.seasonAdjustedMorningTwilight(t.latitude,g(e),e.getFullYear(),a);{const t=n.nightPortions().fajr;return p=t*N,l(a,-p)}}();if((isNaN(r.getTime())||P>r)&&(r=P),n.ishaInterval>0)M=u(d,n.ishaInterval);else{M=new C(b.hourAngle(-1*n.ishaAngle,!0)).utcDate(e.getFullYear(),e.getMonth(),e.getDate()),"MoonsightingCommittee"===n.method&&t.latitude>=55&&(p=N/7,M=l(d,p));const r=function(){if("MoonsightingCommittee"===n.method)return A.seasonAdjustedEveningTwilight(t.latitude,g(e),e.getFullYear(),d,n.shafaq);{const t=n.nightPortions().isha;return p=t*N,l(d,p)}}();(isNaN(M.getTime())||r<M)&&(M=r)}if(f=d,n.maghribAngle){const t=new C(b.hourAngle(-1*n.maghribAngle,!0)).utcDate(e.getFullYear(),e.getMonth(),e.getDate());d<t&&M>t&&(f=t)}const L=(n.adjustments.fajr||0)+(n.methodAdjustments.fajr||0),F=(n.adjustments.sunrise||0)+(n.methodAdjustments.sunrise||0),q=(n.adjustments.dhuhr||0)+(n.methodAdjustments.dhuhr||0),Y=(n.adjustments.asr||0)+(n.methodAdjustments.asr||0),x=(n.adjustments.maghrib||0)+(n.methodAdjustments.maghrib||0),I=(n.adjustments.isha||0)+(n.methodAdjustments.isha||0);this.fajr=c(u(r,L),n.rounding),this.sunrise=c(u(a,F),n.rounding),this.dhuhr=c(u(s,q),n.rounding),this.asr=c(u(o,Y),n.rounding),this.sunset=c(d,n.rounding),this.maghrib=c(u(f,x),n.rounding),this.isha=c(u(M,I),n.rounding)}timeForPrayer(t){return t===P.Fajr?this.fajr:t===P.Sunrise?this.sunrise:t===P.Dhuhr?this.dhuhr:t===P.Asr?this.asr:t===P.Maghrib?this.maghrib:t===P.Isha?this.isha:null}currentPrayer(){let t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:new Date;return t>=this.isha?P.Isha:t>=this.maghrib?P.Maghrib:t>=this.asr?P.Asr:t>=this.dhuhr?P.Dhuhr:t>=this.sunrise?P.Sunrise:t>=this.fajr?P.Fajr:P.None}nextPrayer(){let t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:new Date;return t>=this.isha?P.None:t>=this.maghrib?P.Isha:t>=this.asr?P.Maghrib:t>=this.dhuhr?P.Asr:t>=this.sunrise?P.Dhuhr:t>=this.fajr?P.Sunrise:P.Fajr}}t.CalculationMethod=N,t.CalculationParameters=O,t.Coordinates=s,t.HighLatitudeRule=a,t.Madhab=i,t.PolarCircleResolution=S,t.Prayer=P,t.PrayerTimes=L,t.Qibla=function(t){const e=new s(21.4225241,39.8261818),n=Math.sin(f(e.longitude)-f(t.longitude)),r=Math.cos(f(t.latitude))*Math.tan(f(e.latitude)),i=Math.sin(f(t.latitude))*Math.cos(f(e.longitude)-f(t.longitude));return b(M(Math.atan2(n,r-i)))},t.Rounding=o,t.Shafaq=w,t.SunnahTimes=class{constructor(t){const e=h(t.date,1),n=(new L(t.coordinates,e,t.calculationParameters).fajr.getTime()-t.maghrib.getTime())/1e3;this.middleOfTheNight=c(l(t.maghrib,n/2)),this.lastThirdOfTheNight=c(l(t.maghrib,n*(2/3)))}}});
  /* ADHAN-END */
  return module.exports;
})();

const BY_COUNTRY = { EG: 'Egyptian', SD: 'Egyptian', SA: 'UmmAlQura', BH: 'UmmAlQura', YE: 'UmmAlQura', AE: 'Dubai', KW: 'Kuwait', QA: 'Qatar', TR: 'Turkey', IR: 'Tehran', PK: 'Karachi', IN: 'Karachi', BD: 'Karachi', AF: 'Karachi', SG: 'Singapore', MY: 'Singapore', ID: 'Singapore', BN: 'Singapore', US: 'NorthAmerica', CA: 'NorthAmerica', GB: 'MoonsightingCommittee', IE: 'MoonsightingCommittee' };
const LABEL = { Egyptian: 'الهيئة المصرية', UmmAlQura: 'أم القرى', MuslimWorldLeague: 'رابطة العالم الإسلامي' };

function hijriMonth(date) {
  try {
    const p = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { month: 'numeric' }).formatToParts(date);
    return +p.find((x) => x.type === 'month').value;
  } catch (e) {
    return 0;
  }
}

function method(lat, lng, cc) {
  if (cc && BY_COUNTRY[cc.toUpperCase()]) return BY_COUNTRY[cc.toUpperCase()];
  if (cc) return 'MuslimWorldLeague';
  // no country known (offline first run): coarse boxes for Egypt and Saudi Arabia
  if (lat > 21.9 && lat < 31.8 && lng > 24.6 && lng < 36.9) return 'Egyptian';
  if (lat > 16.3 && lat < 32.2 && lng > 34.5 && lng < 55.7) return 'UmmAlQura';
  return 'MuslimWorldLeague';
}

/** Same rules as src/lib/prayer.ts: Egyptian Dhuhr without +1, Umm al-Qura Isha 120 in Ramadan,
 *  prayers → nearest minute, sunrise → floor. (y, m, d) is the local civil date. */
function times(y, m, d, lat, lng, meth) {
  const coords = new adhan.Coordinates(lat, lng);
  const p = adhan.CalculationMethod[meth]();
  if (meth === 'Egyptian') p.methodAdjustments = Object.assign({}, p.methodAdjustments, { dhuhr: 0 });
  p.highLatitudeRule = adhan.HighLatitudeRule.recommended(coords);
  p.rounding = adhan.Rounding.None;
  const date = new Date(y, m - 1, d, 12);
  if (meth === 'UmmAlQura' && hijriMonth(date) === 9) p.ishaInterval = 120;
  const pt = new adhan.PrayerTimes(coords, date, p);
  const MIN = 60000;
  const t = {};
  for (const k of ORDER) t[k] = new Date((k === 'sunrise' ? Math.floor : Math.round)(pt[k].getTime() / MIN) * MIN);
  return t;
}

/* ---------------- location (cached) ---------------- */
async function where() {
  const KEY = 'pakpt.widget.loc';
  try {
    Location.setAccuracyToThreeKilometers();
    const l = await Location.current();
    let name = '';
    let cc = '';
    try {
      const g = await Location.reverseGeocode(l.latitude, l.longitude, 'ar');
      name = (g && g[0] && (g[0].locality || g[0].subAdministrativeArea || g[0].administrativeArea)) || '';
      cc = (g && g[0] && g[0].isoCountryCode) || '';
    } catch (e) {}
    const v = { lat: l.latitude, lng: l.longitude, name, cc };
    Keychain.set(KEY, JSON.stringify(v));
    return v;
  } catch (e) {
    try {
      if (Keychain.contains(KEY)) return JSON.parse(Keychain.get(KEY));
    } catch (e2) {}
    return FALLBACK;
  }
}

/* ---------------- build ---------------- */
const loc = await where();
const M = method(loc.lat, loc.lng, loc.cc);
const now = new Date();
const today = times(now.getFullYear(), now.getMonth() + 1, now.getDate(), loc.lat, loc.lng, M);
const tm = new Date(now.getTime() + 86400000);
const tomorrow = times(tm.getFullYear(), tm.getMonth() + 1, tm.getDate(), loc.lat, loc.lng, M);

let nextKey = ORDER.find((k) => today[k] > now);
const nextAt = nextKey ? today[nextKey] : tomorrow.fajr;
if (!nextKey) nextKey = 'fajr';
const prevAt = (() => {
  const passed = ORDER.filter((k) => today[k] <= now);
  return passed.length ? today[passed[passed.length - 1]] : new Date(today.fajr.getTime() - 9 * 3600000);
})();
const isFri = now.getDay() === 5;
const label = (k) => (k === 'dhuhr' && isFri ? 'الجمعة' : AR[k]);
const hm = (d) => d.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' }).replace(/\s?[صم]$/, '');
const ap = (d) => (d.getHours() < 12 ? 'ص' : 'م');
const minsLeft = Math.round((nextAt - now) / 60000);
const soon = minsLeft <= 15; // "smart": highlight the last 15 minutes before a prayer
let hijri = '';
try {
  hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'long' }).format(now);
} catch (e) {}

const param = ((args.widgetParameter || '') + '').trim().toLowerCase();
const family = config.widgetFamily || 'large';
const w = new ListWidget();
w.url = APP_URL;
// refresh: right after the next prayer, and 15 min before it (to switch to the "soon" style)
const preSoon = new Date(nextAt.getTime() - 15 * 60000);
w.refreshAfterDate = preSoon > now ? preSoon : new Date(nextAt.getTime() + 30000);

const GOLD = new Color('#f2cf7a');
const IVORY = new Color('#fbf5e6');
const DIM = new Color('#fbf5e6', 0.6);
const ALERT = new Color('#ff9f6b');
const COLORS = { fajr: '#4b6cb7', sunrise: '#c27c4a', dhuhr: '#0e7a5f', asr: '#b07d1f', maghrib: '#b5523b', isha: '#1f2f6b' };

function bg(widget, key) {
  const g = new LinearGradient();
  g.colors = [new Color(COLORS[key]), new Color('#061418')];
  g.locations = [0, 1];
  widget.backgroundGradient = g;
}
function txt(stack, s, size, opts = {}) {
  const t = stack.addText(s);
  t.font = opts.bold === false ? Font.mediumSystemFont(size) : opts.rounded ? Font.boldRoundedSystemFont(size) : Font.boldSystemFont(size);
  if (opts.color) t.textColor = opts.color;
  if (opts.opacity !== undefined) t.textOpacity = opts.opacity;
  t.minimumScaleFactor = opts.min || 0.5;
  t.lineLimit = 1;
  if (opts.center) t.centerAlignText();
  if (opts.right) t.rightAlignText();
  return t;
}
function timer(stack, size, color) {
  const d = stack.addDate(nextAt);
  d.applyTimerStyle(); // ticks every second, rendered by iOS
  d.font = Font.boldRoundedSystemFont(size);
  if (color) d.textColor = color;
  d.minimumScaleFactor = 0.5;
  d.lineLimit = 1;
  return d;
}

if (family === 'accessoryInline') {
  txt(w, `🕌 ${label(nextKey)} ${hm(nextAt)} ${ap(nextAt)}`, 15);
} else if (family === 'accessoryCircular') {
  w.addAccessoryWidgetBackground = true;
  txt(w, label(nextKey).replace('ال', ''), 13, { center: true });
  txt(w, hm(nextAt), 17, { center: true, rounded: true });
} else if (family === 'accessoryRectangular' && param === 'times') {
  // TODAY: 5 prayers, 2 rows, large type; next prayer at full brightness, passed ones dimmed
  w.setPadding(0, 2, 0, 2);
  const rows = [['fajr', 'dhuhr', 'asr'], ['maghrib', 'isha']];
  rows.forEach((row, ri) => {
    const r = w.addStack();
    r.centerAlignContent();
    row.forEach((k, i) => {
      const c = r.addStack();
      c.layoutVertically();
      const on = k === nextKey;
      const done = today[k] <= now;
      txt(c, label(k).replace('ال', ''), 11, { bold: on, opacity: done && !on ? 0.5 : 0.85 });
      txt(c, hm(today[k]), on ? 19 : 17, { rounded: true, opacity: done && !on ? 0.5 : 1 });
      if (i < row.length - 1) r.addSpacer();
    });
    if (ri === 0) w.addSpacer(2);
  });
} else if (family === 'accessoryRectangular') {
  // NEXT PRAYER: name + time on top, huge countdown below
  w.setPadding(0, 2, 0, 2);
  const top = w.addStack();
  top.centerAlignContent();
  txt(top, (soon ? '⏰ ' : '') + label(nextKey), 22, { min: 0.6 });
  top.addSpacer();
  txt(top, `${hm(nextAt)} ${ap(nextAt)}`, 17, { rounded: true, opacity: 0.85 });
  const bot = w.addStack();
  bot.centerAlignContent();
  txt(bot, 'بعد', 14, { bold: false, opacity: 0.8 });
  bot.addSpacer(6);
  timer(bot, 30);
  bot.addSpacer();
} else if (family === 'small') {
  bg(w, nextKey);
  w.setPadding(14, 14, 12, 14);
  txt(w, loc.name || 'مواقيت الصلاة', 12, { color: DIM, bold: false });
  w.addSpacer();
  txt(w, label(nextKey), 30, { color: soon ? ALERT : GOLD });
  txt(w, `${hm(nextAt)} ${ap(nextAt)}`, 18, { color: IVORY, rounded: true });
  w.addSpacer(4);
  timer(w, 28, IVORY);
} else {
  // MEDIUM / LARGE (also StandBy): coloured by the coming prayer, big type, progress bar
  bg(w, nextKey);
  const large = family === 'large' || family === 'extraLarge';
  w.setPadding(16, 18, 14, 18);
  const head = w.addStack();
  head.centerAlignContent();
  txt(head, loc.name || 'مواقيت الصلاة', 13, { color: DIM, bold: false });
  head.addSpacer();
  if (hijri) txt(head, hijri + ' هـ', 13, { color: GOLD, bold: false });
  w.addSpacer(large ? 10 : 6);

  const hero = w.addStack();
  hero.centerAlignContent();
  const left = hero.addStack();
  left.layoutVertically();
  txt(left, (soon ? '⏰ ' : '') + 'الصلاة القادمة', 13, { color: DIM, bold: false });
  txt(left, label(nextKey), large ? 40 : 32, { color: soon ? ALERT : GOLD });
  hero.addSpacer();
  const right = hero.addStack();
  right.layoutVertically();
  txt(right, `${hm(nextAt)} ${ap(nextAt)}`, large ? 22 : 18, { color: IVORY, rounded: true, right: true });
  timer(right, large ? 34 : 28, IVORY);

  // progress since previous prayer, drawn as an image bar
  const frac = Math.max(0, Math.min(1, (now - prevAt) / (nextAt - prevAt)));
  const dc = new DrawContext();
  dc.size = new Size(600, 10);
  dc.opaque = false;
  dc.respectScreenScale = true;
  dc.setFillColor(new Color('#ffffff', 0.18));
  const pathBg = new Path();
  pathBg.addRoundedRect(new Rect(0, 0, 600, 10), 5, 5);
  dc.addPath(pathBg);
  dc.fillPath();
  const pathFg = new Path();
  pathFg.addRoundedRect(new Rect(0, 0, Math.max(10, 600 * frac), 10), 5, 5);
  dc.addPath(pathFg);
  dc.setFillColor(GOLD);
  dc.fillPath();
  w.addSpacer(large ? 10 : 6);
  const bar = w.addImage(dc.getImage());
  bar.imageSize = new Size(large ? 320 : 300, 6);
  bar.centerAlignImage();
  w.addSpacer(large ? 12 : 8);

  if (large) {
    for (const k of ORDER) {
      const r = w.addStack();
      r.centerAlignContent();
      r.setPadding(5, 10, 5, 10);
      r.cornerRadius = 10;
      const on = k === nextKey;
      const done = today[k] <= now && !on;
      if (on) r.backgroundColor = new Color('#ffffff', 0.16);
      const c = on ? GOLD : k === 'sunrise' ? DIM : IVORY;
      txt(r, label(k), k === 'sunrise' ? 16 : 20, { color: c, opacity: done ? 0.55 : 1 });
      r.addSpacer();
      txt(r, `${hm(today[k])} ${ap(today[k])}`, k === 'sunrise' ? 16 : 21, { color: c, rounded: true, opacity: done ? 0.55 : 1 });
      w.addSpacer(2);
    }
  } else {
    const grid = w.addStack();
    for (const k of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) {
      const c = grid.addStack();
      c.layoutVertically();
      const on = k === nextKey;
      const done = today[k] <= now && !on;
      txt(c, label(k).replace('ال', ''), 12, { color: on ? GOLD : DIM, bold: on, center: true });
      txt(c, hm(today[k]), on ? 19 : 17, { color: on ? GOLD : IVORY, rounded: true, opacity: done ? 0.55 : 1, center: true });
      if (k !== 'isha') grid.addSpacer();
    }
  }
  w.addSpacer();
}

if (config.runsInWidget || config.runsInAccessoryWidget) Script.setWidget(w);
else await w.presentLarge();
Script.complete();
