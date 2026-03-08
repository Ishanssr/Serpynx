import { Injectable } from '@nestjs/common';

export interface WorkPartBreakdown {
  partNumber: number;
  title: string;
  description: string;
  estimatedHours?: number;
  dependencies?: string[];
}

@Injectable()
export class WorkBreakdownService {
  async breakDownWork(taskTitle: string, taskDescription: string, requiredSkills: string[]): Promise<WorkPartBreakdown[]> {
    // For now, we'll use a rule-based approach. In a production environment,
    // you might want to integrate with OpenAI GPT or another AI service
    
    const breakdown = this.generateRuleBasedBreakdown(taskTitle, taskDescription, requiredSkills);
    
    // Ensure we always have exactly 3 parts
    while (breakdown.length < 3) {
      breakdown.push(this.generateGenericPart(breakdown.length + 1));
    }
    
    return breakdown.slice(0, 3);
  }

  private generateRuleBasedBreakdown(title: string, description: string, skills: string[]): WorkPartBreakdown[] {
    const lowerTitle = title.toLowerCase();
    const lowerDesc = description.toLowerCase();
    const allText = `${title} ${description}`.toLowerCase();

    // Development-related breakdowns
    if (this.isDevelopmentWork(skills, allText)) {
      return this.getDevelopmentBreakdown(title, description, skills);
    }

    // Design-related breakdowns
    if (this.isDesignWork(skills, allText)) {
      return this.getDesignBreakdown(title, description, skills);
    }

    // Writing/Content-related breakdowns
    if (this.isWritingWork(skills, allText)) {
      return this.getWritingBreakdown(title, description, skills);
    }

    // Marketing-related breakdowns
    if (this.isMarketingWork(skills, allText)) {
      return this.getMarketingBreakdown(title, description, skills);
    }

    // Default generic breakdown
    return this.getGenericBreakdown(title, description);
  }

  private isDevelopmentWork(skills: string[], text: string): boolean {
    const devKeywords = ['react', 'javascript', 'python', 'node', 'developer', 'programming', 'code', 'app', 'website', 'software', 'frontend', 'backend', 'full stack', 'database', 'api'];
    return skills.some(skill => devKeywords.some(keyword => skill.toLowerCase().includes(keyword))) ||
           devKeywords.some(keyword => text.includes(keyword));
  }

  private isDesignWork(skills: string[], text: string): boolean {
    const designKeywords = ['design', 'ui', 'ux', 'figma', 'photoshop', 'illustrator', 'graphic', 'logo', 'brand', 'visual'];
    return skills.some(skill => designKeywords.some(keyword => skill.toLowerCase().includes(keyword))) ||
           designKeywords.some(keyword => text.includes(keyword));
  }

  private isWritingWork(skills: string[], text: string): boolean {
    const writingKeywords = ['writing', 'content', 'blog', 'article', 'copy', 'seo', 'documentation', 'technical writing'];
    return skills.some(skill => writingKeywords.some(keyword => skill.toLowerCase().includes(keyword))) ||
           writingKeywords.some(keyword => text.includes(keyword));
  }

  private isMarketingWork(skills: string[], text: string): boolean {
    const marketingKeywords = ['marketing', 'social media', 'seo', 'advertising', 'campaign', 'promotion', 'digital marketing'];
    return skills.some(skill => marketingKeywords.some(keyword => skill.toLowerCase().includes(keyword))) ||
           marketingKeywords.some(keyword => text.includes(keyword));
  }

  private getDevelopmentBreakdown(title: string, description: string, skills: string[]): WorkPartBreakdown[] {
    return [
      {
        partNumber: 1,
        title: 'Planning & Setup',
        description: 'Project architecture setup, development environment configuration, and initial project structure. Including requirement analysis and technical specifications.',
        estimatedHours: 8,
        dependencies: []
      },
      {
        partNumber: 2,
        title: 'Core Implementation',
        description: 'Development of main features and functionality. This includes implementing the core business logic, user interfaces, and integration points.',
        estimatedHours: 16,
        dependencies: ['Planning & Setup']
      },
      {
        partNumber: 3,
        title: 'Testing & Deployment',
        description: 'Quality assurance, bug fixes, code review, and deployment to production. Includes documentation and final delivery preparation.',
        estimatedHours: 6,
        dependencies: ['Core Implementation']
      }
    ];
  }

  private getDesignBreakdown(title: string, description: string, skills: string[]): WorkPartBreakdown[] {
    return [
      {
        partNumber: 1,
        title: 'Research & Concept Development',
        description: 'Market research, competitor analysis, and initial concept development. Creating mood boards and establishing design direction.',
        estimatedHours: 6,
        dependencies: []
      },
      {
        partNumber: 2,
        title: 'Design Creation',
        description: 'Creating the actual designs, mockups, and prototypes. Developing the visual elements and user interface components.',
        estimatedHours: 12,
        dependencies: ['Research & Concept Development']
      },
      {
        partNumber: 3,
        title: 'Refinement & Delivery',
        description: 'Final revisions based on feedback, preparing design files for delivery, and creating style guides or documentation.',
        estimatedHours: 4,
        dependencies: ['Design Creation']
      }
    ];
  }

  private getWritingBreakdown(title: string, description: string, skills: string[]): WorkPartBreakdown[] {
    return [
      {
        partNumber: 1,
        title: 'Research & Outline',
        description: 'Topic research, audience analysis, and creating a comprehensive content outline or structure.',
        estimatedHours: 4,
        dependencies: []
      },
      {
        partNumber: 2,
        title: 'Content Creation',
        description: 'Writing the main content, following the outline and incorporating SEO best practices if applicable.',
        estimatedHours: 8,
        dependencies: ['Research & Outline']
      },
      {
        partNumber: 3,
        title: 'Editing & Finalization',
        description: 'Proofreading, editing for clarity and style, formatting, and preparing the final deliverable.',
        estimatedHours: 3,
        dependencies: ['Content Creation']
      }
    ];
  }

  private getMarketingBreakdown(title: string, description: string, skills: string[]): WorkPartBreakdown[] {
    return [
      {
        partNumber: 1,
        title: 'Strategy & Planning',
        description: 'Market analysis, target audience identification, and developing comprehensive marketing strategy and campaign plan.',
        estimatedHours: 6,
        dependencies: []
      },
      {
        partNumber: 2,
        title: 'Campaign Implementation',
        description: 'Creating marketing materials, setting up campaigns, and executing the planned marketing activities across channels.',
        estimatedHours: 10,
        dependencies: ['Strategy & Planning']
      },
      {
        partNumber: 3,
        title: 'Analysis & Optimization',
        description: 'Monitoring campaign performance, analyzing results, and optimizing strategies based on data and feedback.',
        estimatedHours: 4,
        dependencies: ['Campaign Implementation']
      }
    ];
  }

  private getGenericBreakdown(title: string, description: string): WorkPartBreakdown[] {
    return [
      {
        partNumber: 1,
        title: 'Discovery & Planning',
        description: 'Initial research, requirement gathering, and planning phase. Understanding project scope and creating a detailed roadmap.',
        estimatedHours: 5,
        dependencies: []
      },
      {
        partNumber: 2,
        title: 'Execution & Development',
        description: 'Main execution phase where the core work is completed based on the planning and requirements gathered.',
        estimatedHours: 10,
        dependencies: ['Discovery & Planning']
      },
      {
        partNumber: 3,
        title: 'Review & Finalization',
        description: 'Quality check, revisions based on feedback, and preparation of final deliverables for client approval.',
        estimatedHours: 3,
        dependencies: ['Execution & Development']
      }
    ];
  }

  private generateGenericPart(partNumber: number): WorkPartBreakdown {
    const titles = ['Additional Requirements', 'Enhancement Phase', 'Final Polish'];
    const descriptions = [
      'Addressing additional requirements and scope items identified during the project.',
      'Implementing enhancements and improvements based on initial work and feedback.',
      'Final quality assurance, documentation, and delivery preparation.'
    ];
    
    return {
      partNumber,
      title: titles[partNumber - 1] || `Part ${partNumber}`,
      description: descriptions[partNumber - 1] || `Additional work part ${partNumber} for project completion.`,
      estimatedHours: 4
    };
  }
}
