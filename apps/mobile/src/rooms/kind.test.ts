import { kindFromName } from "./kind";

test.each([
  ["Bedroom", "bedroom"],
  ["Master bed", "bedroom"],
  ["Kids room", "bedroom"],
  ["غرفة نوم", "bedroom"],
  ["Living room", "living"],
  ["Family lounge", "living"],
  ["الصالة", "living"],
  ["Majlis", "majlis"],
  ["مجلس الرجال", "majlis"],
  ["Diwaniya", "majlis"],
  ["Home office", "office"],
  ["Study", "office"],
  ["مكتب", "office"],
])("%s is a %s", (name, kind) => expect(kindFromName(name)).toBe(kind));

test("a name that says nothing about the room suggests nothing", () => {
  expect(kindFromName("Room 2")).toBeNull();
  expect(kindFromName("Flat 4B")).toBeNull();
});
