import { Command } from "commander";
import { initCommand } from "./init.js";
import { doctorCommand } from "./doctor.js";
import { gateCommand } from "./gate.js";
import { addCommand } from "./add.js";
import { listCommand } from "./list.js";
import { changeCommand } from "./change.js";

const program = new Command();

program
  .name("openharness")
  .description("AI-powered engineering governance framework")
  .version("0.1.0");

program.addCommand(initCommand);
program.addCommand(doctorCommand);
program.addCommand(gateCommand);
program.addCommand(addCommand);
program.addCommand(listCommand);
program.addCommand(changeCommand);

program.parse();
