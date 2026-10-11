import type { FurnitureType } from "@buildit/core";
import { t, type StringKey } from "@/i18n";

// One entry per engine furniture type: the compiler refuses a new type without a name.
const KEY: Record<FurnitureType, StringKey> = {
  sofa: "iSofa", armchair: "iArm", majlis_seat: "iMajlis", ottoman: "iOttoman", bench: "iBench",
  coffee_table: "iCoffee", side_table: "iSide", tv_unit: "iTv", dining_table: "iTable", round_table: "iTable",
  dining_chair: "iDiningChair", bed: "iBed", nightstand: "iNightstand", wardrobe: "iWardrobe", dresser: "iDresser",
  sideboard: "iSideboard", bookshelf: "iBook", desk: "iDesk", office_chair: "iOfficeChair", rug: "iRug",
  floor_lamp: "iLamp", plant: "iPlant", fixture: "iFixture",
};

export const typeName = (type: FurnitureType) => t(KEY[type]);
