/** A reasonable set of valid ID characters. */
export const ID_CHARACTERS = "abcdefghijklmnopqrstuvwxyz0123456789";

/** A more limited set of characters designed to be ambiguous to read and type. */
export const UNAMBIGUOUS_CHARACTERS = "abcdefhjkmnprtwxy2345689";

/** Generate a string ID given a set of characters and a desired length. */
export function generateID(
  idCharacters = ID_CHARACTERS,
  idLength = 10
): string {
  let id = "";
  while (id.length < idLength) {
    id += idCharacters[Math.floor(Math.random() * idCharacters.length)];
  }
  return id;
}
