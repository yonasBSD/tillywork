import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Delete,
    Put,
    UseGuards,
    Request,
} from "@nestjs/common";
import { ProjectsService } from "./projects.service";
import { Project } from "./project.entity";
import { CreateProjectDto } from "./dto/create.project.dto";
import { UpdateProjectDto } from "./dto/update.project.dto";
import { JwtAuthGuard } from "../auth/guards/jwt.auth.guard";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

@ApiTags("projects")
@Controller({
    path: "projects",
    version: "1",
})
export class ProjectsController {
    constructor(private readonly projectsService: ProjectsService) {}

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get()
    findAll(@Request() req): Promise<Project[]> {
        const { user } = req;
        return this.projectsService.findAll({
            where: {
                users: {
                    user,
                },
            },
        });
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get(":id")
    findOne(@Param("id") id: string): Promise<Project> {
        return this.projectsService.findOne(+id);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Post()
    create(
        @Body() createProjectDto: CreateProjectDto,
        @Request() req
    ): Promise<Project> {
        return this.projectsService.create({
            ...createProjectDto,
            ownerId: req.user.id,
            users: [
                {
                    user: req.user,
                    role: "owner",
                    project: createProjectDto as Project,
                },
            ],
        });
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Put(":id")
    update(
        @Param("id") id: string,
        @Body() updateProjectDto: UpdateProjectDto
    ): Promise<Project> {
        return this.projectsService.update(+id, updateProjectDto);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Delete(":id")
    remove(@Param("id") id: string): Promise<void> {
        return this.projectsService.remove(+id);
    }

    @Get("/invite/:inviteCode")
    findOneByInviteCode(@Param("inviteCode") inviteCode: string) {
        return this.projectsService.findOneBy({
            where: {
                inviteCode,
            },
        });
    }
}
