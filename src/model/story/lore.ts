// The map's lore in `options.map.lore`: its name, calendar and the author's description. See docs/architecture/configuration.md
import { resolveLoreDisplayName } from "@/model/localization/entity-display-name";
import { refreshEntityLocalizedNames } from "@/model/localization/localized-names";
import { Names } from "@/model/society/names-generator";
import { requireName } from "@/utils/validation-utils";

class LoreModel {
  /** Rename the map; files it is downloaded as take the name */
  rename(name: string): void {
    const lore = options.map.lore;
    lore.name = requireName(name);
    refreshEntityLocalizedNames(lore, { name: lore.name });
  }

  /** The map title in the selected display mode, never its description */
  getName(): string {
    return resolveLoreDisplayName(options.map.lore);
  }

  /** Set the current year, a whole number that may be negative; history and battle reports are dated by it */
  setYear(year: number): void {
    if (typeof year !== "number" || !Number.isFinite(year)) throw new Error("The year must be a number");
    options.map.lore.calendar.year = Math.round(year);
  }

  /** Set the era the current year belongs to and its short form, such as "Winter Era" and "WE"; without one the short form is abbreviated from the era */
  setEra(era: string, eraShort?: string): void {
    const { calendar } = options.map.lore;
    calendar.era = requireName(era);
    calendar.eraShort = eraShort === undefined ? Names.getEraShort(calendar.era) : requireName(eraShort);
  }

  /** Set the author's free-text description of the world; empty clears it */
  setDescription(text: string): void {
    if (typeof text !== "string") throw new Error("The description must be text");
    options.map.lore.description = text;
  }
}

export const Lore = new LoreModel();
