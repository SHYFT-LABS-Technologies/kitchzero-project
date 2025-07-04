import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Simple authentication middleware
async function authenticate(request: any, reply: any) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({ success: false, error: 'Unauthorized' });
  }
}

export async function settingsRoutes(fastify: FastifyInstance) {
  // Get tenant settings
  fastify.get('/api/tenants/:tenantId/settings', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params as any;
      const userTenantId = request.user!.tenantId;

      // Ensure user can only access their tenant's settings
      if (tenantId !== userTenantId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied to this tenant'
        });
      }

      console.log(`⚙️ Fetching settings for tenant: ${tenantId}`);

      // Try to get existing settings from database
      let settings = await prisma.tenantSettings.findUnique({
        where: { tenantId },
        include: {
          tenant: {
            select: {
              name: true
            }
          }
        }
      });

      // If no settings exist, create default settings
      if (!settings) {
        console.log(`📝 Creating default settings for tenant: ${tenantId}`);
        
        const tenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { name: true }
        });

        if (!tenant) {
          return reply.status(404).send({
            success: false,
            error: 'Tenant not found'
          });
        }

        settings = await prisma.tenantSettings.create({
          data: {
            tenantId,
            currency: 'LKR',
            currencySymbol: 'Rs.',
            timezone: 'Asia/Colombo',
            dateFormat: 'DD/MM/YYYY',
            language: 'en',
            businessName: tenant.name,
            businessAddress: 'Colombo, Sri Lanka',
            businessPhone: '+94 11 234 5678',
            businessEmail: 'info@restaurant.lk',
            taxRate: 8.0, // VAT rate in Sri Lanka
            notificationEmail: true,
            notificationSms: false,
            lowStockThreshold: 10,
            wasteAlertThreshold: 50
          },
          include: {
            tenant: {
              select: {
                name: true
              }
            }
          }
        });
      }

      console.log(`✅ Settings retrieved for tenant: ${tenantId}`);

      return reply.send({
        success: true,
        data: {
          currency: settings.currency,
          currencySymbol: settings.currencySymbol,
          timezone: settings.timezone,
          dateFormat: settings.dateFormat,
          language: settings.language,
          businessName: settings.businessName,
          businessAddress: settings.businessAddress,
          businessPhone: settings.businessPhone,
          businessEmail: settings.businessEmail,
          taxRate: settings.taxRate,
          notificationEmail: settings.notificationEmail,
          notificationSms: settings.notificationSms,
          lowStockThreshold: settings.lowStockThreshold,
          wasteAlertThreshold: settings.wasteAlertThreshold
        }
      });

    } catch (error) {
      console.error('❌ Get settings error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch settings'
      });
    }
  });

  // Update tenant settings
  fastify.put('/api/tenants/:tenantId/settings', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params as any;
      const settings = request.body as any;
      const userTenantId = request.user!.tenantId;
      const userRole = request.user!.role;

      // Ensure user can only update their tenant's settings
      if (tenantId !== userTenantId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied to this tenant'
        });
      }

      // Only restaurant admins and above can update settings
      if (userRole === 'BRANCH_ADMIN') {
        return reply.status(403).send({
          success: false,
          error: 'Insufficient permissions to update settings'
        });
      }

      console.log(`⚙️ Updating settings for tenant: ${tenantId}`);

      // Validate required fields
      const allowedCurrencies = ['LKR', 'USD', 'EUR', 'GBP', 'INR'];
      if (settings.currency && !allowedCurrencies.includes(settings.currency)) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid currency code'
        });
      }

      // Validate numeric fields
      if (settings.taxRate !== undefined && (typeof settings.taxRate !== 'number' || settings.taxRate < 0 || settings.taxRate > 100)) {
        return reply.status(400).send({
          success: false,
          error: 'Tax rate must be a number between 0 and 100'
        });
      }

      if (settings.lowStockThreshold !== undefined && (typeof settings.lowStockThreshold !== 'number' || settings.lowStockThreshold < 0)) {
        return reply.status(400).send({
          success: false,
          error: 'Low stock threshold must be a non-negative number'
        });
      }

      if (settings.wasteAlertThreshold !== undefined && (typeof settings.wasteAlertThreshold !== 'number' || settings.wasteAlertThreshold < 0)) {
        return reply.status(400).send({
          success: false,
          error: 'Waste alert threshold must be a non-negative number'
        });
      }

      // Get currency symbol based on currency code
      const currencySymbols: Record<string, string> = {
        'LKR': 'Rs.',
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'INR': '₹'
      };

      const updateData: any = {};
      
      // Update only provided fields
      if (settings.currency !== undefined) {
        updateData.currency = settings.currency;
        updateData.currencySymbol = currencySymbols[settings.currency] || 'Rs.';
      }
      if (settings.timezone !== undefined) updateData.timezone = settings.timezone;
      if (settings.dateFormat !== undefined) updateData.dateFormat = settings.dateFormat;
      if (settings.language !== undefined) updateData.language = settings.language;
      if (settings.businessName !== undefined) updateData.businessName = settings.businessName;
      if (settings.businessAddress !== undefined) updateData.businessAddress = settings.businessAddress;
      if (settings.businessPhone !== undefined) updateData.businessPhone = settings.businessPhone;
      if (settings.businessEmail !== undefined) updateData.businessEmail = settings.businessEmail;
      if (settings.taxRate !== undefined) updateData.taxRate = settings.taxRate;
      if (settings.notificationEmail !== undefined) updateData.notificationEmail = settings.notificationEmail;
      if (settings.notificationSms !== undefined) updateData.notificationSms = settings.notificationSms;
      if (settings.lowStockThreshold !== undefined) updateData.lowStockThreshold = settings.lowStockThreshold;
      if (settings.wasteAlertThreshold !== undefined) updateData.wasteAlertThreshold = settings.wasteAlertThreshold;

      // Update or create tenant settings
      const updatedSettings = await prisma.tenantSettings.upsert({
        where: { tenantId },
        update: updateData,
        create: {
          tenantId,
          currency: settings.currency || 'LKR',
          currencySymbol: currencySymbols[settings.currency] || 'Rs.',
          timezone: settings.timezone || 'Asia/Colombo',
          dateFormat: settings.dateFormat || 'DD/MM/YYYY',
          language: settings.language || 'en',
          businessName: settings.businessName || '',
          businessAddress: settings.businessAddress || 'Colombo, Sri Lanka',
          businessPhone: settings.businessPhone || '+94 11 234 5678',
          businessEmail: settings.businessEmail || 'info@restaurant.lk',
          taxRate: settings.taxRate !== undefined ? settings.taxRate : 8.0,
          notificationEmail: settings.notificationEmail !== undefined ? settings.notificationEmail : true,
          notificationSms: settings.notificationSms !== undefined ? settings.notificationSms : false,
          lowStockThreshold: settings.lowStockThreshold !== undefined ? settings.lowStockThreshold : 10,
          wasteAlertThreshold: settings.wasteAlertThreshold !== undefined ? settings.wasteAlertThreshold : 50
        }
      });

      // Update tenant name if business name was changed
      if (settings.businessName) {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { name: settings.businessName }
        });
      }

      console.log(`✅ Settings updated for tenant: ${tenantId}`);

      return reply.send({
        success: true,
        message: 'Settings updated successfully',
        data: {
          currency: updatedSettings.currency,
          currencySymbol: updatedSettings.currencySymbol,
          timezone: updatedSettings.timezone,
          dateFormat: updatedSettings.dateFormat,
          language: updatedSettings.language,
          businessName: updatedSettings.businessName,
          businessAddress: updatedSettings.businessAddress,
          businessPhone: updatedSettings.businessPhone,
          businessEmail: updatedSettings.businessEmail,
          taxRate: updatedSettings.taxRate,
          notificationEmail: updatedSettings.notificationEmail,
          notificationSms: updatedSettings.notificationSms,
          lowStockThreshold: updatedSettings.lowStockThreshold,
          wasteAlertThreshold: updatedSettings.wasteAlertThreshold
        }
      });

    } catch (error) {
      console.error('❌ Update settings error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to update settings'
      });
    }
  });
}