export interface SACity {
  name: string;
  province: string;
  latitude: number;
  longitude: number;
  aliases: string[];
}

export const SA_CITIES: SACity[] = [
  { name: 'Johannesburg', province: 'Gauteng', latitude: -26.2041, longitude: 28.0473, aliases: ['joburg', 'jhb', 'jozi', 'sandton', 'soweto', 'randburg', 'roodepoort'] },
  { name: 'Pretoria', province: 'Gauteng', latitude: -25.7479, longitude: 28.2293, aliases: ['tshwane', 'centurion', 'hatfield'] },
  { name: 'Ekurhuleni', province: 'Gauteng', latitude: -26.1490, longitude: 28.2250, aliases: ['benoni', 'boksburg', 'germiston', 'kempton park', 'springs'] },
  { name: 'Cape Town', province: 'Western Cape', latitude: -33.9249, longitude: 18.4241, aliases: ['cape town', 'kaapstad', 'mitchells plain', 'khayelitsha', 'bellville'] },
  { name: 'Durban', province: 'KwaZulu-Natal', latitude: -29.8587, longitude: 31.0218, aliases: ['ethekwini', 'umhlanga', 'pinetown', 'phoenix'] },
  { name: 'Pietermaritzburg', province: 'KwaZulu-Natal', latitude: -29.6006, longitude: 30.3794, aliases: ['pmb', 'msunduzi'] },
  { name: 'Port Elizabeth', province: 'Eastern Cape', latitude: -33.9608, longitude: 25.6022, aliases: ['gqeberha', 'pe', 'uitenhage'] },
  { name: 'East London', province: 'Eastern Cape', latitude: -33.0292, longitude: 27.8546, aliases: ['buffalo city', 'el'] },
  { name: 'Bloemfontein', province: 'Free State', latitude: -29.0852, longitude: 26.1596, aliases: ['mangaung', 'bfn'] },
  { name: 'Polokwane', province: 'Limpopo', latitude: -23.9045, longitude: 29.4689, aliases: ['pietersburg'] },
  { name: 'Nelspruit', province: 'Mpumalanga', latitude: -25.4753, longitude: 30.9694, aliases: ['mbombela'] },
  { name: 'Kimberley', province: 'Northern Cape', latitude: -28.7282, longitude: 24.7499, aliases: ['sol plaatje'] },
  { name: 'Rustenburg', province: 'North West', latitude: -25.6672, longitude: 27.2424, aliases: ['bojanala'] },
  { name: 'Mahikeng', province: 'North West', latitude: -25.8650, longitude: 25.6444, aliases: ['mafikeng', 'mmabatho'] },
];

export function nearestSACity(lat: number, lon: number): SACity {
  let best = SA_CITIES[0]!;
  let bestDist = Number.MAX_VALUE;
  for (const city of SA_CITIES) {
    const dLat = city.latitude - lat;
    const dLon = city.longitude - lon;
    const d = dLat * dLat + dLon * dLon;
    if (d < bestDist) {
      bestDist = d;
      best = city;
    }
  }
  return best;
}

export function detectCityFromText(text: string): SACity | null {
  const lower = text.toLowerCase();
  for (const city of SA_CITIES) {
    if (lower.includes(city.name.toLowerCase())) return city;
    for (const alias of city.aliases) {
      if (lower.includes(alias)) return city;
    }
  }
  return null;
}