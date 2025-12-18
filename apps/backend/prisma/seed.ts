import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default printers with filament pricing
  const printer1 = await prisma.printer.upsert({
    where: { id: 'printer-1' },
    update: {},
    create: {
      id: 'printer-1',
      name: 'Prusa MK4',
      hourlyRate: 180, // INR per hour
      filaments: {
        create: [
          {
            id: 'printer-1-pla',
            filamentType: 'pla',
            name: 'PLA',
            pricePerGram: 2.5,
          },
          {
            id: 'printer-1-petg',
            filamentType: 'petg',
            name: 'PETG',
            pricePerGram: 3.0,
          },
          {
            id: 'printer-1-abs',
            filamentType: 'abs',
            name: 'ABS',
            pricePerGram: 3.5,
          },
        ],
      },
    },
  });

  const printer2 = await prisma.printer.upsert({
    where: { id: 'printer-2' },
    update: {},
    create: {
      id: 'printer-2',
      name: 'Creality Ender 3 V3',
      hourlyRate: 120, // INR per hour
      filaments: {
        create: [
          {
            id: 'printer-2-pla',
            filamentType: 'pla',
            name: 'PLA',
            pricePerGram: 2.0,
          },
          {
            id: 'printer-2-petg',
            filamentType: 'petg',
            name: 'PETG',
            pricePerGram: 2.5,
          },
        ],
      },
    },
  });

  const printer3 = await prisma.printer.upsert({
    where: { id: 'printer-3' },
    update: {},
    create: {
      id: 'printer-3',
      name: 'Bambu Lab X1C',
      hourlyRate: 250, // INR per hour
      filaments: {
        create: [
          {
            id: 'printer-3-pla',
            filamentType: 'pla',
            name: 'PLA',
            pricePerGram: 3.0,
          },
          {
            id: 'printer-3-petg',
            filamentType: 'petg',
            name: 'PETG',
            pricePerGram: 3.5,
          },
          {
            id: 'printer-3-abs',
            filamentType: 'abs',
            name: 'ABS',
            pricePerGram: 4.0,
          },
          {
            id: 'printer-3-tpu',
            filamentType: 'tpu',
            name: 'TPU',
            pricePerGram: 5.0,
          },
        ],
      },
    },
  });

  console.log('✅ Created printers:', {
    printer1: printer1.name,
    printer2: printer2.name,
    printer3: printer3.name,
  });

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

