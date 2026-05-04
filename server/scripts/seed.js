import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Organization from '../models/Organization.model.js';
import User from '../models/User.model.js';
import Project from '../models/Project.model.js';
import Document from '../models/Document.model.js';
import Lead from '../models/Lead.model.js';

dotenv.config();

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      Organization.deleteMany({}),
      User.deleteMany({}),
      Project.deleteMany({}),
      Document.deleteMany({}),
      Lead.deleteMany({})
    ]);
    console.log('🗑️  Cleared existing data');

    // Create a temporary owner ID (we'll create the actual user with this ID)
    const tempOwnerId = new mongoose.Types.ObjectId();

    // Create organization with temporary owner ID
    const org = new Organization({
      name: 'Demo Real Estate',
      slug: 'demo-real-estate',
      plan: 'pro',
      ownerId: tempOwnerId, // Use temp ID to satisfy validation
      limits: {
        maxUsers: 10,
        maxDocuments: 100,
        maxProjects: 50,
        monthlyQueryLimit: 5000,
        maxStorageBytes: 1073741824
      },
      subscription: {
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });
    await org.save();
    console.log('✅ Created organization:', org.name);

    // Create owner user with the same temp ID
    const owner = new User({
      _id: tempOwnerId, // Use the same ID we set as ownerId
      organizationId: org._id,
      name: 'John Doe',
      email: 'owner@demo.com',
      passwordHash: 'Password123', // Will be hashed by pre-save hook
      role: 'ORG_OWNER',
      isActive: true,
      emailVerified: true
    });
    await owner.save();
    console.log('✅ Created owner user:', owner.email);

    // Create additional users
    const admin = new User({
      organizationId: org._id,
      name: 'Jane Smith',
      email: 'admin@demo.com',
      passwordHash: 'Password123',
      role: 'ORG_ADMIN',
      isActive: true,
      emailVerified: true
    });
    await admin.save();

    const agent1 = new User({
      organizationId: org._id,
      name: 'Mike Johnson',
      email: 'agent1@demo.com',
      passwordHash: 'Password123',
      role: 'SALES_AGENT',
      isActive: true,
      emailVerified: true
    });
    await agent1.save();

    const agent2 = new User({
      organizationId: org._id,
      name: 'Sarah Williams',
      email: 'agent2@demo.com',
      passwordHash: 'Password123',
      role: 'SALES_AGENT',
      isActive: true,
      emailVerified: true
    });
    await agent2.save();

    org.usage.userCount = 4;
    await org.save();
    console.log('✅ Created additional users');

    // Create projects
    const project1 = new Project({
      organizationId: org._id,
      name: 'Skyline Towers',
      description: 'Luxury high-rise apartments with stunning city views',
      location: {
        address: '123 Main Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        pincode: '400001'
      },
      status: 'under_construction',
      amenities: ['Swimming Pool', 'Gym', 'Parking', 'Security', 'Garden'],
      specifications: {
        totalUnits: 200,
        availableUnits: 150,
        bhkTypes: ['2BHK', '3BHK', '4BHK'],
        priceRange: {
          min: 8000000,
          max: 25000000,
          currency: 'INR'
        },
        carpetArea: {
          min: 1000,
          max: 2500,
          unit: 'sqft'
        },
        possessionDate: new Date('2025-12-31')
      },
      assignedAgents: [agent1._id, agent2._id],
      createdBy: owner._id
    });
    await project1.save();

    const project2 = new Project({
      organizationId: org._id,
      name: 'Green Valley Villas',
      description: 'Spacious villas surrounded by nature',
      location: {
        address: '456 Garden Road',
        city: 'Pune',
        state: 'Maharashtra',
        country: 'India',
        pincode: '411001'
      },
      status: 'ready_to_move',
      amenities: ['Club House', 'Park', 'Parking', '24/7 Security'],
      specifications: {
        totalUnits: 50,
        availableUnits: 10,
        bhkTypes: ['3BHK', '4BHK'],
        priceRange: {
          min: 15000000,
          max: 35000000,
          currency: 'INR'
        },
        carpetArea: {
          min: 2000,
          max: 3500,
          unit: 'sqft'
        }
      },
      assignedAgents: [agent1._id],
      createdBy: owner._id
    });
    await project2.save();

    const project3 = new Project({
      organizationId: org._id,
      name: 'Urban Heights',
      description: 'Modern apartments in the heart of the city',
      location: {
        address: '789 City Center',
        city: 'Bangalore',
        state: 'Karnataka',
        country: 'India',
        pincode: '560001'
      },
      status: 'planning',
      amenities: ['Gym', 'Swimming Pool', 'Parking', 'Power Backup'],
      specifications: {
        totalUnits: 120,
        availableUnits: 120,
        bhkTypes: ['1BHK', '2BHK', '3BHK'],
        priceRange: {
          min: 5000000,
          max: 15000000,
          currency: 'INR'
        },
        carpetArea: {
          min: 600,
          max: 1800,
          unit: 'sqft'
        },
        possessionDate: new Date('2026-06-30')
      },
      assignedAgents: [agent2._id],
      createdBy: owner._id
    });
    await project3.save();

    org.usage.projectCount = 3;
    await org.save();
    console.log('✅ Created 3 projects');

    // Create sample leads
    const leads = [
      {
        organizationId: org._id,
        name: 'Rahul Sharma',
        email: 'rahul@example.com',
        phone: '9876543210',
        source: 'chatbot',
        status: 'new',
        budget: { min: 8000000, max: 12000000, currency: 'INR' },
        preferredLocation: 'Mumbai',
        bhkType: '3BHK',
        projectsInterested: [project1._id],
        assignedAgentId: agent1._id
      },
      {
        organizationId: org._id,
        name: 'Priya Patel',
        email: 'priya@example.com',
        phone: '9876543211',
        source: 'manual',
        status: 'contacted',
        budget: { min: 15000000, max: 20000000, currency: 'INR' },
        preferredLocation: 'Pune',
        bhkType: '4BHK',
        projectsInterested: [project2._id],
        assignedAgentId: agent1._id,
        lastContactedAt: new Date()
      },
      {
        organizationId: org._id,
        name: 'Amit Kumar',
        email: 'amit@example.com',
        phone: '9876543212',
        source: 'website',
        status: 'qualified',
        budget: { min: 6000000, max: 10000000, currency: 'INR' },
        preferredLocation: 'Bangalore',
        bhkType: '2BHK',
        projectsInterested: [project3._id],
        assignedAgentId: agent2._id,
        lastContactedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        organizationId: org._id,
        name: 'Sneha Reddy',
        email: 'sneha@example.com',
        phone: '9876543213',
        source: 'chatbot',
        status: 'site_visit',
        budget: { min: 10000000, max: 15000000, currency: 'INR' },
        preferredLocation: 'Mumbai',
        bhkType: '3BHK',
        projectsInterested: [project1._id],
        assignedAgentId: agent2._id,
        lastContactedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        organizationId: org._id,
        name: 'Vikram Singh',
        email: 'vikram@example.com',
        phone: '9876543214',
        source: 'manual',
        status: 'negotiating',
        budget: { min: 18000000, max: 25000000, currency: 'INR' },
        preferredLocation: 'Pune',
        bhkType: '4BHK',
        projectsInterested: [project2._id],
        assignedAgentId: agent1._id,
        lastContactedAt: new Date()
      }
    ];

    for (const leadData of leads) {
      const lead = new Lead(leadData);
      await lead.calculateScore();
      await lead.save();
    }
    console.log('✅ Created 5 sample leads');

    console.log('\n🎉 Seed data created successfully!');
    console.log('\n📝 Login credentials:');
    console.log('Owner: owner@demo.com / Password123');
    console.log('Admin: admin@demo.com / Password123');
    console.log('Agent 1: agent1@demo.com / Password123');
    console.log('Agent 2: agent2@demo.com / Password123');
    console.log('\n🔑 Organization API Key:', org.apiKey);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seedData();
