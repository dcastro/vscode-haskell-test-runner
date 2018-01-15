import { InteroProxy } from "../interoProxy";

// TODO: detect failure to reload
export async function reload(intero: InteroProxy): Promise<void> {
  await intero.sendRawRequest(':r');
}