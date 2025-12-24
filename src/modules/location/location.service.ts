import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import * as geoip from 'geoip-lite';
import { Logger } from '../../common/utils';
import { CurrentLocationResponseDto } from './dto/current-location.dto';

@Injectable()
export class LocationService {
  private readonly logger = Logger.child({
    service: 'LocationService',
  });

  /**
   * Extract IP address from request
   * Handles various proxy headers and direct connections
   */
  private getClientIp(request: Request): string {
    // Check various headers that proxies might use
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      return ips.split(',')[0].trim();
    }

    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    // Fallback to connection remote address
    return request.ip || request.socket.remoteAddress || '127.0.0.1';
  }

  /**
   * Get current location based on IP address
   */
  getCurrentLocation(request: Request): CurrentLocationResponseDto {
    try {
      const ip = this.getClientIp(request);
      
      this.logger.debug('Getting location for IP', { ip });

      // Handle localhost/private IPs
      if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
        this.logger.warn('Local/private IP detected, using default location', { ip });
        // Return a default location (can be configured)
        return {
          latitude: 0,
          longitude: 0,
          city: 'Unknown',
          country: 'Unknown',
        };
      }

      const geo = geoip.lookup(ip);

      if (!geo) {
        this.logger.warn('Could not determine location from IP', { ip });
        return {
          latitude: 0,
          longitude: 0,
          city: 'Unknown',
          country: 'Unknown',
        };
      }

      const result: CurrentLocationResponseDto = {
        latitude: geo.ll[0],
        longitude: geo.ll[1],
        city: geo.city || undefined,
        country: geo.country || undefined,
        region: geo.region || undefined,
      };

      this.logger.debug('Location determined', { ip, result });

      return result;
    } catch (error) {
      this.logger.error('Error getting location from IP', error as Error);
      return {
        latitude: 0,
        longitude: 0,
        city: 'Unknown',
        country: 'Unknown',
      };
    }
  }
}

