import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const suppliers = [
  {
    alias: 'RLJ',
    businessName: 'RELAIS LE JARDIN SRL',
    iban: 'IT58U0306905070615276558662',
    service: 'CATERING DINNER 17.06',
    eventDate: new Date('2026-06-17'),
    notes: '95€ x pax + servizio',
    costs: [{ amountNet: 5055, totalGross: 5055 }],
    payments: [
      { type: 'ACCONTO', amount: 2527.50, status: 'PENDING' },
      { type: 'SALDO', amount: 2527.50, status: 'PENDING' }
    ]
  },
  {
    alias: 'VILLA SOSPISIO',
    businessName: "MIRO' SRL",
    iban: 'IT18Y0569603200000012744X47',
    service: 'LOCATION DINNER 19.06',
    eventDate: new Date('2026-06-19'),
    costs: [],
    payments: [
      { type: 'ACCONTO', amount: 1220, dueDate: new Date('2026-04-29'), paidDate: new Date('2026-04-29'), status: 'PAID', causale: 'acconto evento del 19/06/26 villa sospisio' }
    ]
  },
  {
    alias: 'IMAGO HASSLER',
    businessName: 'HASSLER ROMA SPA',
    iban: 'IT33V0303203201010000004032',
    service: 'LOCATION E LUNCH 19.06',
    eventDate: new Date('2026-06-19'),
    costs: [{ amountNet: 16050, vatRate: 22, notes: 'IVA mista 22% e 10%' }],
    payments: [
      { type: 'ACCONTO', amount: 4500, dueDate: new Date('2026-04-21'), paidDate: new Date('2026-04-21'), status: 'PAID', causale: 'Deposito cauzionale per lunch 32 ospiti 19 giugno 2026' },
      { type: 'SALDO', amount: 8025, dueDate: new Date('2026-06-01'), status: 'PENDING', causale: 'Secondo deposito lunch 19 giugno 2026' }
    ]
  },
  {
    alias: 'OTTAVIO',
    businessName: 'RISTORANTE OTTAVIO DAL 1955 SRLS',
    service: 'LUNCH 20.06',
    eventDate: new Date('2026-06-20'),
    notes: 'IVATO',
    costs: [{ amountNet: 4150, totalGross: 4150 }],
    payments: [
      { type: 'ACCONTO', amount: 8025, status: 'PENDING' }
    ]
  },
  {
    alias: 'ANTICO ARCO',
    service: 'LUNCH 18.06',
    eventDate: new Date('2026-06-18'),
    notes: '80€ x pax',
    costs: [{ amountNet: 2800 }],
    payments: []
  },
  {
    alias: 'PALOMBINI',
    businessName: 'PALOMBINI RICEVIMENTI SRL',
    service: 'CATERING DINNER 18.06',
    eventDate: new Date('2026-06-18'),
    costs: [{ amountNet: 5480, vatRate: 10 }],
    payments: []
  },
  {
    alias: 'LE BON TON',
    businessName: 'SOC. KING DAVID SRL',
    iban: 'IT37L0200805206000003564416',
    service: 'CATERING DINNER 19.06',
    eventDate: new Date('2026-06-19'),
    costs: [{ amountNet: 4800 }],
    payments: []
  },
  {
    alias: 'TERRAZZA BORROMINI',
    service: 'DINNER 20.06',
    eventDate: new Date('2026-06-20'),
    costs: [{ amountNet: 8900 }],
    payments: []
  },
  {
    alias: 'CASA CAVALIERI RODI',
    service: 'LOCATION 17.06',
    eventDate: new Date('2026-06-17'),
    costs: [],
    payments: []
  },
  {
    alias: 'MUSEI VATICANI',
    service: 'VISITA',
    costs: [],
    payments: [
      { type: 'ACCONTO', amount: 3000, status: 'PENDING' }
    ]
  },
  {
    alias: 'SOCIETA\' TRASPORTI',
    businessName: 'EG NCC',
    service: 'TRASPORTI',
    costs: [],
    payments: []
  },
  {
    alias: 'ORESTE FIORI',
    service: 'ALLESTIMENTO FLOREALE',
    costs: [],
    payments: []
  },
  {
    alias: 'GUIDA GHETTO',
    businessName: 'SARA PROCACCIA',
    service: 'GUIDA GHETTO',
    notes: 'rit inps +4%',
    costs: [{ amountNet: 600 }],
    payments: []
  },
  {
    alias: 'GUIDA PALAZZO COLONNA',
    service: 'GUIDA PALAZZO COLONNA',
    costs: [],
    payments: []
  },
  {
    alias: 'GUIDA MUSEI VATICANI',
    service: 'GUIDA MUSEI VATICANI',
    costs: [],
    payments: []
  },
  {
    alias: 'VILLA ALBANI TORLONIA',
    service: 'VISITA 20.06',
    eventDate: new Date('2026-06-20'),
    costs: [],
    payments: [
      { type: 'ACCONTO', amount: 1000, status: 'PENDING' }
    ]
  }
];

async function seed() {
  console.log('Seeding database...');

  // Clear existing data
  await prisma.payment.deleteMany();
  await prisma.cost.deleteMany();
  await prisma.document.deleteMany();
  await prisma.supplier.deleteMany();

  for (const s of suppliers) {
    const { costs, payments, ...supplierData } = s;
    const supplier = await prisma.supplier.create({
      data: {
        ...supplierData,
        costs: { create: costs },
        payments: { create: payments }
      }
    });
    console.log(`  Created: ${supplier.alias}`);
  }

  console.log(`Seeded ${suppliers.length} suppliers.`);
}

seed().catch(console.error).finally(() => prisma.$disconnect());
