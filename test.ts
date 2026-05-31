import Astronomy from "astronomy-engine";

const time = new Astronomy.AstroTime(new Date());

['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'].forEach(pl => {
  const geoVec = Astronomy.GeoVector(pl, time, true); // true for aberration
  // To ecliptic coordinates (geocentric)
  const ecl = Astronomy.Ecliptic(geoVec);
  console.log(pl, ecl.elon);
});
