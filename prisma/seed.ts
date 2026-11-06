import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SETORES_DATA = [
  {
    numero: 1,
    nome: 'Setor 1 - Aeroporto',
    coordenadorNome: 'Pr. Rúbens Nunes',
    corHex: '#1D4225',
    bairros: [
      {
        nome: 'Aeroporto 1 e 2 / Ouro Negro (Macarrão)',
        latitude: -5.192574,
        longitude: -37.362968,
      },
    ],
  },
  {
    numero: 2,
    nome: 'Setor 2 - Belo Horizonte / Lagoa do Mato',
    coordenadorNome: 'Pra. Adriana Karina e Pra. Silvana',
    corHex: '#D4A84B',
    bairros: [
      {
        nome: 'Belo Horizonte',
        latitude: -5.208358,
        longitude: -37.354951,
      },
      {
        nome: 'Lagoa do Mato',
        latitude: -5.203225,
        longitude: -37.358053,
      },
    ],
  },
  {
    numero: 3,
    nome: 'Setor 3 - Sumaré',
    coordenadorNome: 'Pedro Cordeiro',
    corHex: '#7A8165',
    bairros: [
      {
        nome: 'Sumaré / Alto do Sumaré',
        latitude: -5.231982,
        longitude: -37.326608,
      },
    ],
  },
  {
    numero: 4,
    nome: 'Setor 4 - Bom Jesus / Planalto',
    coordenadorNome: 'Jessy',
    corHex: '#B5651D',
    bairros: [
      {
        nome: 'Bom Jesus',
        latitude: -5.229623,
        longitude: -37.353115,
      },
      {
        nome: 'Planalto Treze de Maio',
        latitude: -5.220257,
        longitude: -37.340397,
      },
      {
        nome: 'Conjunto Liberdade',
        latitude: -5.225244,
        longitude: -37.328639,
      },
      {
        nome: 'Alagados',
        latitude: -5.21768,
        longitude: -37.348085,
      },
    ],
  },
  {
    numero: 5,
    nome: 'Setor 5 - Abolição / Santa Delmira',
    coordenadorNome: 'Pb. Adriano Medeiros e Emanuela Larissa',
    corHex: '#2E6B8A',
    bairros: [
      {
        nome: 'Abolição',
        latitude: -5.158089,
        longitude: -37.364025,
      },
      {
        nome: 'Santa Delmira',
        latitude: -5.147924,
        longitude: -37.362247,
      },
      {
        nome: 'Monsenhor Américo',
        latitude: -5.1618,
        longitude: -37.348662,
      },
    ],
  },
  {
    numero: 6,
    nome: 'Setor 6 - Vingt Rosado / Universitário',
    coordenadorNome: 'Andrezza e Jezanias',
    corHex: '#8E3B46',
    bairros: [
      {
        nome: 'Parque Universitário',
        latitude: -5.195794,
        longitude: -37.300506,
      },
      {
        nome: 'Vingt Rosado',
        latitude: -5.206978,
        longitude: -37.295225,
      },
      {
        nome: 'Rincão',
        latitude: -5.202147,
        longitude: -37.306622,
      },
      {
        nome: 'Pintos',
        latitude: -5.192365,
        longitude: -37.316201,
      },
    ],
  },
  {
    numero: 7,
    nome: 'Setor 7 - Doze Anos / Boa Vista',
    coordenadorNome: 'Isaac Moisés',
    corHex: '#4F7942',
    bairros: [
      {
        nome: 'Doze Anos',
        latitude: -5.189785,
        longitude: -37.352002,
      },
      {
        nome: 'Boa Vista',
        latitude: -5.195414,
        longitude: -37.355036,
      },
    ],
  },
  {
    numero: 8,
    nome: 'Setor 8 - Alto de São Manoel',
    coordenadorNome: 'Isaac Ramalho',
    corHex: '#6A4C93',
    bairros: [
      {
        nome: 'Alto de São Manoel',
        latitude: -5.213424,
        longitude: -37.333956,
      },
      {
        nome: 'Dom Jaime Câmara',
        latitude: -5.229529,
        longitude: -37.318161,
      },
      {
        nome: 'Presidente Costa e Silva',
        latitude: -5.209665,
        longitude: -37.32415,
      },
    ],
  },
  {
    numero: 9,
    nome: 'Setor 9 - Jardins / Nova Mossoró',
    coordenadorNome: 'Pr. Hermes',
    corHex: '#C77D3A',
    bairros: [
      {
        nome: 'Jardins',
        latitude: -5.146259,
        longitude: -37.341681,
      },
      {
        nome: 'Isla Verde',
        latitude: -5.147436,
        longitude: -37.337889,
      },
      {
        nome: 'Nova Mossoró',
        latitude: -5.126148,
        longitude: -37.32195,
      },
      {
        nome: 'Santa Júlia',
        latitude: -5.125171,
        longitude: -37.323417,
      },
    ],
  },
  {
    numero: 10,
    nome: 'Setor 10 - Santo Antônio / Barrocas',
    coordenadorNome: 'Pr. Cristiano e Pr. Magno',
    corHex: '#2F4F4F',
    bairros: [
      {
        nome: 'Santo Antônio',
        latitude: -5.184292,
        longitude: -37.346676,
      },
      {
        nome: 'Barrocas',
        latitude: -5.164539,
        longitude: -37.331959,
      },
    ],
  },
  {
    numero: 11,
    nome: 'Setor 11 - Centro / Paredões',
    coordenadorNome: 'Pb. Diego',
    corHex: '#A0522D',
    bairros: [
      {
        nome: 'Centro',
        latitude: -5.192354,
        longitude: -37.341518,
      },
      {
        nome: 'Ilha de Santa Luzia',
        latitude: -5.201786,
        longitude: -37.338288,
      },
      {
        nome: 'Paredões',
        latitude: -5.183683,
        longitude: -37.334532,
      },
      {
        nome: 'Bom Jardim',
        latitude: -5.180053,
        longitude: -37.33864,
      },
    ],
  },
  {
    numero: 12,
    nome: 'Setor 12 - Redenção',
    coordenadorNome: 'Maycon Maya',
    corHex: '#3B7A57',
    bairros: [
      {
        nome: 'Redenção (área antiga)',
        latitude: -5.140765,
        longitude: -37.348762,
      },
    ],
  },
  {
    numero: 13,
    nome: 'Setor 13 - Itapetinga / Cidade Oeste',
    coordenadorNome: 'Gineton Costa',
    corHex: '#9C8A3E',
    bairros: [
      {
        nome: 'Cidade Oeste',
        latitude: -5.232,
        longitude: -37.365,
      },
      {
        nome: 'Itapetinga',
        latitude: -5.226735,
        longitude: -37.376987,
      },
    ],
  },
  {
    numero: 14,
    nome: 'Setor 14 - Nova Betânia / Bela Vista',
    coordenadorNome: 'Alisson',
    corHex: '#5C6B73',
    bairros: [
      {
        nome: 'Nova Betânia',
        latitude: -5.178574,
        longitude: -37.366126,
      },
      {
        nome: 'Bela Vista',
        latitude: -5.181311,
        longitude: -37.39256,
      },
      {
        nome: 'Bom Pastor',
        latitude: -5.188733,
        longitude: -37.37631,
      },
      {
        nome: 'Dix-Sept Rosado',
        latitude: -5.191204,
        longitude: -37.379787,
      },
    ],
  },
];

async function main() {
  console.log('Iniciando o Seed dos 14 Setores e Bairros de Mossoró...');

  for (const s of SETORES_DATA) {
    const setor = await prisma.setor.upsert({
      where: { numero: s.numero },
      update: {
        nome: s.nome,
        coordenadorNome: s.coordenadorNome,
        corHex: s.corHex,
      },
      create: {
        numero: s.numero,
        nome: s.nome,
        coordenadorNome: s.coordenadorNome,
        corHex: s.corHex,
      },
    });

    console.log(`Setor ${setor.numero} cadastrado/atualizado: ${setor.nome}`);

    for (const b of s.bairros) {
      const bairroExistente = await prisma.bairro.findFirst({
        where: {
          nome: b.nome,
          setorNumero: s.numero,
        },
      });

      if (!bairroExistente) {
        await prisma.bairro.create({
          data: {
            nome: b.nome,
            setorNumero: s.numero,
            latitude: b.latitude,
            longitude: b.longitude,
          },
        });
      }
    }
  }

  console.log('Seed territorial de Setores e Bairros concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro durante a execução do seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
