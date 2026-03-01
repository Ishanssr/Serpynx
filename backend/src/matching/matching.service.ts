import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MatchingService {
    private readonly SKILL_WEIGHT = 0.4;
    private readonly PRICE_WEIGHT = 0.3;
    private readonly RATING_WEIGHT = 0.3;

    constructor(private prisma: PrismaService) { }

    calculateSmartScore(
        freelancerSkills: string[],
        requiredSkills: string[],
        bidAmount: number,
        taskBudget: number,
        freelancerAvgRating: number,
    ): number {
        // Skill match score (0-1)
        const skillMatchScore = requiredSkills.length > 0
            ? freelancerSkills.filter((s) =>
                requiredSkills.some((rs) => rs.toLowerCase() === s.toLowerCase()),
            ).length / requiredSkills.length
            : 0.5;

        // Price score (0-1): lower bid relative to budget = higher score
        const priceScore = taskBudget > 0
            ? Math.max(0, Math.min(1, 1 - bidAmount / taskBudget))
            : 0.5;

        // Rating score (0-1)
        const ratingScore = freelancerAvgRating / 5;

        // Weighted sum
        const score =
            this.SKILL_WEIGHT * skillMatchScore +
            this.PRICE_WEIGHT * priceScore +
            this.RATING_WEIGHT * ratingScore;

        return Math.round(score * 100) / 100;
    }

    async computeAndStoreBidScore(bidId: string): Promise<number> {
        const bid = await this.prisma.bid.findUnique({
            where: { id: bidId },
            include: {
                freelancer: { select: { skills: true, avgRating: true } },
                task: { select: { budget: true, requiredSkills: true } },
            },
        });

        if (!bid) return 0;

        const score = this.calculateSmartScore(
            bid.freelancer.skills,
            bid.task.requiredSkills,
            bid.amount,
            bid.task.budget,
            bid.freelancer.avgRating,
        );

        await this.prisma.bid.update({
            where: { id: bidId },
            data: { smartScore: score },
        });

        return score;
    }
}
