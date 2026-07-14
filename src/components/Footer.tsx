import React from 'react';
import { FaWhatsapp, FaInstagram, FaTiktok, FaLinkedinIn } from 'react-icons/fa6';
import logoDarkTheme from '../assets/global/Logo - Dark Theme.png';

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  const navigationLinks = ['ABOUT US', 'OUR TEAM', 'PRODUCTS', 'SERVICES', 'NEWS', 'ACHIEVEMENTS', 'CONTACT US'];
  const socialLinks = [
    { id: 'whatsapp', Icon: FaWhatsapp, url: 'https://wa.me/6281316556908' },
    { id: 'instagram', Icon: FaInstagram, url: 'https://www.instagram.com/uniinside.studio?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==' },
    { id: 'tiktok', Icon: FaTiktok, url: 'https://www.tiktok.com/@uniinside.studio?is_from_webapp=1&sender_device=pc' },
    { id: 'linkedin', Icon: FaLinkedinIn, url: 'https://www.linkedin.com/company/uni-inside-studio' },
  ];

  return (
    <footer className="w-full bg-[#202121] text-[#f0f0f0] z-10 relative border-t border-[#333] pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-8 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          {/* Logo and About */}
          <div className="flex flex-col items-start space-y-6">
            <div className="flex items-center gap-3">
              <img src={logoDarkTheme} alt="Uni-Inside Logo" className="w-12 h-12 object-contain" />
              <span className="text-2xl font-black tracking-wider uppercase text-white">
                UNI-INSIDE
              </span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed font-medium">
              We are a creative agency dedicated to crafting premium digital experiences and building innovative solutions for tomorrow.
            </p>
            {/* Social Icons */}
            <div className="flex items-center gap-4 pt-2">
              {socialLinks.map((social) => (
                <a 
                  key={social.id} 
                  href={social.url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-10 h-10 rounded-full bg-[#333] flex items-center justify-center text-white hover:bg-[#f9d02d] hover:text-[#202121] transition-all duration-300"
                >
                  <social.Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="flex flex-col items-start md:items-center">
            <div className="w-full max-w-[150px]">
              <h4 className="text-white font-bold tracking-widest uppercase mb-6 text-sm">Navigation</h4>
              <ul className="space-y-4">
                {navigationLinks.map((link) => (
                  <li key={link}>
                    <a 
                      href={`#${link.toLowerCase().replace(/\s+/g, '-')}`}
                      onClick={(e) => {
                        const targetId = link.toLowerCase().replace(/\s+/g, '-');
                        const el = document.getElementById(targetId);
                        if (el) {
                          e.preventDefault();
                          el.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                      className="text-gray-400 hover:text-[#f9d02d] text-sm font-semibold tracking-wider transition-colors duration-200"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Contact Info */}
          <div className="flex flex-col items-start">
            <h4 className="text-white font-bold tracking-widest uppercase mb-6 text-sm">Get in Touch</h4>
            <div className="space-y-4 text-sm text-gray-400 font-medium">
              <p className="flex flex-col">
                <span className="text-gray-500 mb-1">Email</span>
                <a href="mailto:uninsidemed@gmail.com" className="text-white hover:text-[#f9d02d] transition-colors">uninsidemed@gmail.com</a>
              </p>
              <p className="flex flex-col pt-2">
                <span className="text-gray-500 mb-1">Phone</span>
                <a href="tel:+6281316556908" className="text-white hover:text-[#f9d02d] transition-colors">+62 813-1655-6908</a>
              </p>
              <p className="flex flex-col pt-2">
                <span className="text-gray-500 mb-1">Location</span>
                <span className="text-white leading-relaxed">
                  Telkom University, Gedung Selaru 4th floor
                </span>
              </p>
            </div>
          </div>

          {/* Google Maps */}
          <div className="flex flex-col items-start lg:col-span-1">
            <h4 className="text-white font-bold tracking-widest uppercase mb-6 text-sm">Find Us</h4>
            <div className="w-full h-[200px] rounded-2xl overflow-hidden border-2 border-[#333] shadow-lg">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3960.304324586581!2d107.6326175!3d-6.973377200000001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e68e9afad6fa06f%3A0xd4fc2f579a78668a!2sSchool%20of%20Applied%20Science%20Telkom%20University!5e0!3m2!1sen!2sid!4v1783657462332!5m2!1sen!2sid" 
                className="w-full h-full" 
                style={{ border: 0 }} 
                allowFullScreen={true} 
                loading="lazy" 
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="w-full mt-20 pt-8 border-t border-[#333] flex flex-col justify-center items-center gap-4">
          <p className="text-gray-500 text-xs font-semibold tracking-wider">
            © {currentYear} UNI-INSIDE. ALL RIGHTS RESERVED.
          </p>
        </div>
      </div>
    </footer>
  );
};
