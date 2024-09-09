"use client";

import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { signIn, signOut } from "next-auth/react";

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <Button disabled>Loading...</Button>;
  }

  if (session) {
    return <Button onClick={() => signOut()}>Sign out</Button>;
  }
  return <Button onClick={() => signIn()}>Sign in</Button>;
}
