import {
  PrismaClient,
  MembershipRole,
  ProjectRole,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction(async (tx) => {
    // Reuse the demo user if it already exists.
    const user = await tx.user.upsert({
      where: { email: 'demo@worksphere.local' },
      update: { name: 'WorkSphere Demo User' },
      create: {
        email: 'demo@worksphere.local',
        name: 'WorkSphere Demo User',
      },
    });

    // Reuse the demo organization if it already exists.
    const org = await tx.organization.upsert({
      where: { slug: 'demo-workspace' },
      update: { name: 'Demo Workspace' },
      create: {
        name: 'Demo Workspace',
        slug: 'demo-workspace',
      },
    });

    await tx.membership.upsert({
      where: {
        organizationId_userId: {
          organizationId: org.id,
          userId: user.id,
        },
      },
      update: {
        role: MembershipRole.OWNER,
        status: 'ACTIVE',
      },
      create: {
        organizationId: org.id,
        userId: user.id,
        role: MembershipRole.OWNER,
      },
    });

    // Find the existing demo project before creating one.
    let project = await tx.project.findFirst({
      where: {
        organizationId: org.id,
        name: 'Getting Started',
      },
    });

    if (project) {
      project = await tx.project.update({
        where: { id: project.id },
        data: {
          description:
            'A small sample project created by the WorkSphere database seed.',
          status: ProjectStatus.ACTIVE,
        },
      });
    } else {
      project = await tx.project.create({
        data: {
          organizationId: org.id,
          name: 'Getting Started',
          description:
            'A small sample project created by the WorkSphere database seed.',
          status: ProjectStatus.ACTIVE,
          createdById: user.id,
        },
      });
    }

    await tx.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId: project.id,
          userId: user.id,
        },
      },
      update: { role: ProjectRole.MANAGER },
      create: {
        projectId: project.id,
        userId: user.id,
        role: ProjectRole.MANAGER,
      },
    });

    // Find the existing demo task before creating one.
    let task = await tx.task.findFirst({
      where: {
        projectId: project.id,
        title: 'Explore the WorkSphere workspace',
      },
    });

    if (task) {
      task = await tx.task.update({
        where: { id: task.id },
        data: {
          description:
            'Sample task. Safe to delete after verifying the seed.',
          priority: TaskPriority.MEDIUM,
          status: TaskStatus.TODO,
        },
      });
    } else {
      task = await tx.task.create({
        data: {
          organizationId: org.id,
          projectId: project.id,
          title: 'Explore the WorkSphere workspace',
          description:
            'Sample task. Safe to delete after verifying the seed.',
          priority: TaskPriority.MEDIUM,
        },
      });
    }

    await tx.taskAssignee.upsert({
      where: {
        taskId_userId: {
          taskId: task.id,
          userId: user.id,
        },
      },
      update: {},
      create: {
        taskId: task.id,
        userId: user.id,
      },
    });

    console.log('Demo seed completed successfully.');
    console.log(`Organization: ${org.name} (${org.id})`);
    console.log(`Project: ${project.name} (${project.id})`);
    console.log(`Task: ${task.title} (${task.id})`);
  });
}

main()
  .catch((error) => {
    console.error('Database seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
