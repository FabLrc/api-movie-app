import { PrismaClient } from '@prisma/client';
import { config } from '../src/config/index.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Sample data for generating realistic movies
const genres = [
  'Action',
  'Comedy',
  'Drama',
  'Horror',
  'Sci-Fi',
  'Romance',
  'Thriller',
  'Animation',
  'Documentary',
  'Adventure',
];

const directors = [
  'Christopher Nolan',
  'Quentin Tarantino',
  'Steven Spielberg',
  'Martin Scorsese',
  'Ridley Scott',
  'James Cameron',
  'Denis Villeneuve',
  'Greta Gerwig',
  'Jordan Peele',
  'Wes Anderson',
];

const actors = [
  { name: 'Leonardo DiCaprio', imageUrl: 'https://i.pravatar.cc/150?img=1' },
  { name: 'Meryl Streep', imageUrl: 'https://i.pravatar.cc/150?img=2' },
  { name: 'Tom Hanks', imageUrl: 'https://i.pravatar.cc/150?img=3' },
  { name: 'Scarlett Johansson', imageUrl: 'https://i.pravatar.cc/150?img=4' },
  { name: 'Robert De Niro', imageUrl: 'https://i.pravatar.cc/150?img=5' },
  { name: 'Cate Blanchett', imageUrl: 'https://i.pravatar.cc/150?img=6' },
  { name: 'Denzel Washington', imageUrl: 'https://i.pravatar.cc/150?img=7' },
  { name: 'Natalie Portman', imageUrl: 'https://i.pravatar.cc/150?img=8' },
  { name: 'Morgan Freeman', imageUrl: 'https://i.pravatar.cc/150?img=9' },
  { name: 'Emma Stone', imageUrl: 'https://i.pravatar.cc/150?img=10' },
];

const languages = ['en', 'fr', 'es', 'de', 'it', 'ja', 'ko', 'zh'];

const adjectives = [
  'Dark',
  'Lost',
  'Eternal',
  'Silent',
  'Last',
  'First',
  'Hidden',
  'Secret',
  'Final',
  'Ancient',
];

const nouns = [
  'Knight',
  'Shadow',
  'Dawn',
  'City',
  'Journey',
  'Legend',
  'Mystery',
  'Empire',
  'Revenge',
  'Destiny',
];

// Sample usernames for generating users
const usernames = [
  'movie_buff', 'cinema_lover', 'film_critic', 'action_fan', 'horror_addict',
  'comedy_king', 'drama_queen', 'sci_fi_nerd', 'classic_viewer', 'indie_fan',
  'blockbuster_bro', 'animation_ace', 'thriller_seeker', 'romance_reader', 'doc_watcher',
  'fantasy_follower', 'mystery_mind', 'adventure_alex', 'retro_reviewer', 'modern_maven',
];

// Sample comments for movies
const commentTemplates = [
  'This movie was absolutely amazing! Highly recommend it.',
  'One of the best films I\'ve seen this year. Outstanding performances.',
  'Great cinematography and storytelling. A must-watch!',
  'Incredible direction and acting. Left me speechless.',
  'Not what I expected, but pleasantly surprised. Worth watching.',
  'The plot was engaging from start to finish. Loved every minute.',
  'Phenomenal soundtrack and visual effects. Pure cinema magic.',
  'A masterpiece that deserves all the praise it gets.',
  'The cast delivered exceptional performances throughout.',
  'Emotionally powerful and thought-provoking. Brilliantly executed.',
  'Decent film but could have been better. Still entertaining.',
  'The pacing was perfect and kept me engaged the whole time.',
  'A bit slow at times, but the ending was worth it.',
  'Visually stunning with a compelling narrative.',
  'One of those films that stays with you long after it ends.',
];


function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateMovieTitle(): string {
  return `${randomElement(adjectives)} ${randomElement(nouns)}`;
}

function generateDescription(): string {
  return `A compelling story about ${randomElement(nouns).toLowerCase()} that takes you on an unforgettable journey through ${randomElement(adjectives).toLowerCase()} landscapes.`;
}

function generateCast() {
  const castSize = Math.floor(Math.random() * 5) + 3;
  return randomElements(actors, castSize).map((actor, index) => ({
    ...actor,
    character: `Character ${index + 1}`,
    order: index,
  }));
}

function generateCrew() {
  const director = randomElement(directors);
  const producer = randomElement(actors);
  const cinematographer = randomElement(actors);
  
  return [
    { 
      name: director, 
      job: 'Director', 
      department: 'Directing',
      imageUrl: `https://i.pravatar.cc/150?u=${director}`,
    },
    {
      name: producer.name,
      job: 'Producer',
      department: 'Production',
      imageUrl: producer.imageUrl,
    },
    {
      name: cinematographer.name,
      job: 'Cinematographer',
      department: 'Camera',
      imageUrl: cinematographer.imageUrl,
    },
  ];
}

function randomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime()),
  );
}

async function seed() {
  console.log('🌱 Starting database seed...');

  // Clear existing data in correct order (due to foreign key constraints)
  console.log('🧹 Clearing existing data...');
  await prisma.comment.deleteMany({});
  await prisma.rating.deleteMany({});
  await prisma.favorite.deleteMany({});
  await prisma.watched.deleteMany({});
  await prisma.movie.deleteMany({});
  await prisma.user.deleteMany({});

  // Generate and insert users
  const userCount = 50;
  console.log(`👥 Generating ${userCount} users...`);
  
  const password = await bcrypt.hash('password123', 10);
  const users = [];
  
  for (let i = 0; i < userCount; i++) {
    users.push({
      email: `${usernames[i % usernames.length]}${i}@example.com`,
      password,
      username: `${usernames[i % usernames.length]}${i}`,
      role: i === 0 ? 'ADMIN' : 'USER', // First user is admin
    });
  }

  await prisma.user.createMany({ data: users });
  const createdUsers = await prisma.user.findMany();
  console.log(`✅ Created ${createdUsers.length} users (1 admin, ${createdUsers.length - 1} regular users)`);

  // Generate and insert movies
  const movieCount = 1000;
  console.log(`📽️  Generating ${movieCount} movies...`);

  const movies = [];
  for (let i = 0; i < movieCount; i++) {
    const releaseDate = randomDate(new Date(1980, 0, 1), new Date());
    const budget = Math.floor(Math.random() * 200_000_000) + 1_000_000;
    const revenue = Math.floor(budget * (Math.random() * 5 + 0.5));

    movies.push({
      title: generateMovieTitle(),
      description: generateDescription(),
      releaseDate,
      duration: Math.floor(Math.random() * 120) + 80,
      genres: randomElements(genres, Math.floor(Math.random() * 3) + 1),
      director: randomElement(directors),
      cast: generateCast(),
      crew: generateCrew(),
      poster: `https://picsum.photos/seed/${i}/300/450`,
      backdrop: `https://picsum.photos/seed/${i + 1000}/1280/720`,
      originalLanguage: randomElement(languages),
      budget,
      revenue,
      averageRating: 0, // Will be calculated from ratings
      ratingCount: 0,   // Will be calculated from ratings
    });

    // Insert in batches of 100 for better performance
    if (movies.length === 100 || i === movieCount - 1) {
      await prisma.movie.createMany({
        data: movies,
      });
      console.log(`✅ Inserted ${i + 1}/${movieCount} movies`);
      movies.length = 0; // Clear array
    }
  }

  const createdMovies = await prisma.movie.findMany();
  console.log(`📊 Total movies in database: ${createdMovies.length}`);

  // Generate ratings
  console.log('⭐ Generating ratings...');
  const ratings = [];
  const movieRatingsMap = new Map<string, number[]>(); // Track ratings per movie
  
  for (const user of createdUsers) {
    // Each user rates 10-50 random movies
    const moviesToRate = randomElements(createdMovies, Math.floor(Math.random() * 41) + 10);
    
    for (const movie of moviesToRate) {
      const ratingValue = Math.floor(Math.random() * 10) + 1; // 1-10
      ratings.push({
        userId: user.id,
        movieId: movie.id,
        rating: ratingValue,
        createdAt: randomDate(movie.releaseDate || new Date(1980, 0, 1), new Date()),
      });

      // Track for average calculation
      if (!movieRatingsMap.has(movie.id)) {
        movieRatingsMap.set(movie.id, []);
      }
      movieRatingsMap.get(movie.id)!.push(ratingValue);
    }
  }

  await prisma.rating.createMany({ data: ratings });
  console.log(`✅ Created ${ratings.length} ratings`);

  // Update movie averageRating and ratingCount
  console.log('📊 Updating movie rating statistics...');
  for (const [movieId, ratingValues] of movieRatingsMap.entries()) {
    const average = ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length;
    await prisma.movie.update({
      where: { id: movieId },
      data: {
        averageRating: parseFloat(average.toFixed(1)),
        ratingCount: ratingValues.length,
      },
    });
  }
  console.log(`✅ Updated rating statistics for ${movieRatingsMap.size} movies`);

  // Generate favorites
  console.log('❤️  Generating favorites...');
  const favorites = [];
  
  for (const user of createdUsers) {
    // Each user favorites 5-20 random movies
    const moviesToFavorite = randomElements(createdMovies, Math.floor(Math.random() * 16) + 5);
    
    for (const movie of moviesToFavorite) {
      favorites.push({
        userId: user.id,
        movieId: movie.id,
        createdAt: randomDate(new Date(2020, 0, 1), new Date()),
      });
    }
  }

  await prisma.favorite.createMany({ data: favorites });
  console.log(`✅ Created ${favorites.length} favorites`);

  // Generate watched
  console.log('👁️  Generating watched movies...');
  const watched = [];
  
  for (const user of createdUsers) {
    // Each user has watched 20-100 random movies
    const moviesToWatch = randomElements(createdMovies, Math.floor(Math.random() * 81) + 20);
    
    for (const movie of moviesToWatch) {
      watched.push({
        userId: user.id,
        movieId: movie.id,
        watchedAt: randomDate(movie.releaseDate || new Date(1980, 0, 1), new Date()),
      });
    }
  }

  await prisma.watched.createMany({ data: watched });
  console.log(`✅ Created ${watched.length} watched records`);

  // Generate comments
  console.log('💬 Generating comments...');
  const comments = [];
  
  for (const user of createdUsers) {
    // Each user comments on 5-15 random movies
    const moviesToComment = randomElements(createdMovies, Math.floor(Math.random() * 11) + 5);
    
    for (const movie of moviesToComment) {
      comments.push({
        userId: user.id,
        movieId: movie.id,
        content: randomElement(commentTemplates),
        createdAt: randomDate(movie.releaseDate || new Date(1980, 0, 1), new Date()),
      });
    }
  }

  await prisma.comment.createMany({ data: comments });
  console.log(`✅ Created ${comments.length} comments`);

  // Final statistics
  console.log('\n✨ Seed completed successfully!');
  console.log('📊 Database Statistics:');
  console.log(`   - Users: ${await prisma.user.count()}`);
  console.log(`   - Movies: ${await prisma.movie.count()}`);
  console.log(`   - Ratings: ${await prisma.rating.count()}`);
  console.log(`   - Favorites: ${await prisma.favorite.count()}`);
  console.log(`   - Comments: ${await prisma.comment.count()}`);
  console.log(`   - Watched: ${await prisma.watched.count()}`);
}

seed()
  .catch((error) => {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
