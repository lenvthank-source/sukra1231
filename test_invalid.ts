import Astronomy from "astronomy-engine";
try {
  console.log("Testing invalid date...");
  const t = new Astronomy.AstroTime(new Date(NaN));
  const v = Astronomy.GeoVector("Sun", t, true);
  const ecl = Astronomy.Ecliptic(v);
  console.log("Result for Invalid:", ecl.elon);
} catch (e) {
  console.log("Error:", e.message);
}
