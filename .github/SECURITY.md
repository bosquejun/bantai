# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible for receiving such patches depends on the CVSS v3.0 Rating:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of Bantai seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### How to Report

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to:

**bosquejun@gmail.com**

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

### What to Include

Please include the following information in your report:

- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit the issue

This information will help us triage your report more quickly.

### What to Expect

1. **Acknowledgment**: You will receive an acknowledgment email within 48 hours.
2. **Initial Assessment**: We will provide an initial assessment within 7 days.
3. **Updates**: We will keep you informed of our progress every 7-10 days.
4. **Resolution**: We will notify you when the vulnerability is resolved.

### Disclosure Policy

When the security team receives a security bug report, they will assign it to a primary handler. This person will coordinate the fix and release process, involving the following steps:

1. Confirm the problem and determine the affected versions
2. Audit code to find any potential similar problems
3. Prepare fixes for all releases still under maintenance
4. Publish security advisories

We ask that you:

- Allow us a reasonable amount of time to work on a fix before publishing any details
- Act in good faith to avoid privacy violations, destruction of data, and interruption or degradation of our services
- Not violate any laws or breach any agreements in the course of your security research

### Recognition

We believe in recognizing security researchers who help keep Bantai secure. If you are the first to report a unique vulnerability, and we make a code change based on the issue, we would be happy to:

- Credit you in our security advisories
- Add your name to our SECURITY.md file (with your permission)

Thank you for helping keep Bantai and our users safe!
